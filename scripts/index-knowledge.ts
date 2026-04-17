/**
 * Smart Agentic RAG Knowledge Indexing Script
 *
 * Plug-and-play: drop a subfolder with index.md into data/knowledge/ and it gets picked up.
 *   index.md  -> chunked + embedded into Qdrant (wiki collection)
 *   static.md -> injected verbatim into system prompt (not indexed)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { createHash, randomUUID } from 'crypto';
import { indexKnowledgeFile } from '../src/core/services/indexing.service';
import { isIndexed } from '../src/core/services/qdrant.service';

const ROOT = process.cwd();
const KNOWLEDGE_DIR = resolve(ROOT, 'data/knowledge');
const MANIFEST_PATH = resolve(ROOT, 'data/.index-manifest.json');

// Auto-discover: scan data/knowledge/*/ subfolders for index.md files.
function buildRegistry(): { mode: string; file: string; label: string }[] {
  const entries: { mode: string; file: string; label: string }[] = [];
  if (!existsSync(KNOWLEDGE_DIR)) return entries;
  for (const name of readdirSync(KNOWLEDGE_DIR)) {
    const dir = join(KNOWLEDGE_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const indexFile = join(dir, 'index.md');
    if (!existsSync(indexFile)) continue;
    // Map to the actual Qdrant collection name
    entries.push({ mode: 'vmg_docs_wiki', file: `data/knowledge/${name}/index.md`, label: name });
  }
  return entries;
}

// ── Manifest ──────────────────────────────────────────────────────────────────
interface ManifestEntry {
  hash: string;
  indexedAt: string;
  chunks: number;
}

type Manifest = Record<string, ManifestEntry>; // key = "mode:file"

function manifestKey(mode: string, file: string) {
  return `${mode}:${file}`;
}

function loadManifest(): Manifest {
  if (existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch {
      console.warn('⚠️  Could not parse manifest — treating all as unindexed');
    }
  }
  return {};
}

function saveManifest(manifest: Manifest) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function fileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const args = process.argv.slice(2);
  const force   = args.includes('--force');
  const dryRun  = args.includes('--dry-run');

  const manifest = loadManifest();
  const registry = buildRegistry();

  if (registry.length === 0) {
    console.log('⚠️  No index.md files found.');
    return;
  }

  console.log(`\n🚀  Agentic RAG Smart Indexing${dryRun ? ' [DRY RUN]' : ''}${force ? ' [FORCE]' : ''}`);

  let indexed = 0, skipped = 0, failed = 0;

  for (const { mode, file, label } of registry) {
    const filePath = resolve(ROOT, file);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    const hash = fileHash(content);
    const key = manifestKey(mode, file);
    const entry = manifest[key];
    const collectionOk = await isIndexed(mode).catch(() => false);

    if (!force && collectionOk && entry && entry.hash === hash) {
      console.log(`  ⏭  [${mode}] ${label} — up-to-date`);
      skipped++;
      continue;
    }

    console.log(`  🔄 [${mode}] ${label} — Indexing...`);
    if (dryRun) { indexed++; continue; }

    try {
      // Use a fixed or random UUID for the manifest tracking
      const fileId = randomUUID();
      const stats = await indexKnowledgeFile(content, file, mode, fileId, {
        skipRewrite: process.env.SKIP_REWRITE === 'true',
      });

      manifest[key] = { hash, indexedAt: new Date().toISOString(), chunks: stats.chunks };
      saveManifest(manifest);
      console.log(`  ✅ [${mode}] ${label} — ${stats.chunks} chunks indexed.`);
      indexed++;
    } catch (err) {
      console.error(`  ❌ [${mode}] ${label} — failed:`, err);
      failed++;
    }
  }

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
