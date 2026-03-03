/**
 * Smart URASys Knowledge Indexing Script
 *
 * Plug-and-play: drop a subfolder with index.md into data/knowledge/ and it gets picked up.
 *   index.md  -> chunked + embedded into Qdrant (wiki collection)
 *   static.md -> injected verbatim into system prompt (not indexed)
 *
 * Usage:
 *   pnpm index-knowledge            # index all changed/new files
 *   pnpm index-knowledge --status   # show current state
 *   pnpm index-knowledge --dry-run  # preview without writing
 *   pnpm index-knowledge --force    # re-index everything
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { createHash } from 'crypto';
import { indexKnowledgeFile } from '../src/services/indexing.service';
import { isIndexed } from '../src/services/qdrant.service';
import type { ServiceMode } from '../src/lib/qdrant';

const ROOT = process.cwd();
const KNOWLEDGE_DIR = resolve(ROOT, 'data/knowledge');
const MANIFEST_PATH = resolve(ROOT, 'data/.index-manifest.json');

// Auto-discover: scan data/knowledge/*/ subfolders for index.md files.
// Each subfolder is a knowledge domain; all index into the 'wiki' collection.
function buildRegistry(): { mode: ServiceMode; file: string; label: string }[] {
  const entries: { mode: ServiceMode; file: string; label: string }[] = [];
  if (!existsSync(KNOWLEDGE_DIR)) return entries;
  for (const name of readdirSync(KNOWLEDGE_DIR)) {
    const dir = join(KNOWLEDGE_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const indexFile = join(dir, 'index.md');
    if (!existsSync(indexFile)) continue;
    entries.push({ mode: 'wiki', file: `data/knowledge/${name}/index.md`, label: name });
  }
  return entries;
}


// ── Manifest ──────────────────────────────────────────────────────────────────
interface ManifestEntry {
  hash: string;         // SHA-256 of file content (first 16 hex chars)
  indexedAt: string;    // ISO timestamp
  chunks: number;
  faqs: number;
}

type Manifest = Record<string, ManifestEntry>; // key = "mode:file"

function manifestKey(mode: ServiceMode, file: string) {
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

// ── Status display ────────────────────────────────────────────────────────────
async function showStatus(manifest: Manifest) {
  const KNOWLEDGE_REGISTRY = buildRegistry();
  console.log('\n📋  Index Status\n');
  if (KNOWLEDGE_REGISTRY.length === 0) {
    console.log('  (no index.md files found in data/knowledge/*/)');return;
  }
  for (const { mode, file, label } of KNOWLEDGE_REGISTRY) {
    const key = manifestKey(mode, file);
    const entry = manifest[key];
    const collectionFull = await isIndexed(mode).catch(() => false);
    const fileExists = existsSync(resolve(ROOT, file));

    let fileStatus = '';
    if (fileExists && entry) {
      const current = fileHash(readFileSync(resolve(ROOT, file), 'utf-8'));
      fileStatus = current === entry.hash ? '✅ up-to-date' : '🔄 changed';
    } else if (!fileExists) {
      fileStatus = '❌ file missing';
    } else {
      fileStatus = '⬜ not indexed';
    }

    const meta = entry
      ? `${entry.chunks} chunks · ${entry.faqs} FAQs · ${entry.indexedAt.slice(0, 10)}`
      : 'no manifest entry';
    const collLabel = collectionFull ? '' : '  ⚠️  collection empty';

    console.log(`  [${mode}] ${label}  ${fileStatus}${collLabel}`);
    console.log(`         ${meta}`);
    console.log(`         ${file}`);
    console.log();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const args = process.argv.slice(2);
  const force   = args.includes('--force');
  const dryRun  = args.includes('--dry-run');
  const status  = args.includes('--status');

  const manifest = loadManifest();

  const KNOWLEDGE_REGISTRY = buildRegistry();

  if (KNOWLEDGE_REGISTRY.length === 0) {
    console.log('⚠️  No index.md files found in data/knowledge/*/  — nothing to index.');
    return;
  }

  if (status) {
    await showStatus(manifest);
    return;
  }

  const entries = KNOWLEDGE_REGISTRY;

  console.log(`\n🚀  URASys Smart Indexing${dryRun ? ' [DRY RUN]' : ''}${force ? ' [FORCE]' : ''}`);
  console.log(`    Discovered ${KNOWLEDGE_REGISTRY.length} domain(s): ${KNOWLEDGE_REGISTRY.map(e => e.label).join(', ')}\n`);

  let indexed = 0, skipped = 0, failed = 0;
  const totalTokens = { prompt: 0, completion: 0, total: 0 };

  // Cache per-mode collection state to avoid repeated Qdrant calls
  const collectionStateCache = new Map<ServiceMode, boolean>();
  async function getCollectionState(mode: ServiceMode) {
    if (!collectionStateCache.has(mode)) {
      collectionStateCache.set(mode, await isIndexed(mode).catch(() => false));
    }
    return collectionStateCache.get(mode)!;
  }

  for (const { mode, file, label } of entries) {
    const filePath = resolve(ROOT, file);

    // 1. Check file exists
    if (!existsSync(filePath)) {
      console.log(`  ❌ [${mode}] ${label} — file not found: ${file}`);
      failed++;
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');
    const hash = fileHash(content);
    const key = manifestKey(mode, file);
    const entry = manifest[key];
    const collectionOk = await getCollectionState(mode);

    // 2. Decide whether to index
    // If collection has data but no manifest entry, seed the manifest and skip re-indexing.
    if (!force && collectionOk && !entry) {
      manifest[key] = { hash, indexedAt: new Date().toISOString(), chunks: 0, faqs: 0 };
      saveManifest(manifest);
      console.log(`  ⏭  [${mode}] ${label} — collection populated, manifest seeded (hash recorded)`);
      skipped++;
      continue;
    }

    const reasons: string[] = [];
    if (force) {
      reasons.push('--force');
    } else {
      if (!collectionOk)                reasons.push('collection empty');
      else if (entry!.hash !== hash)    reasons.push('file changed');
    }

    if (reasons.length === 0) {
      console.log(
        `  ⏭  [${mode}] ${label} — up-to-date` +
        ` (${entry!.chunks} chunks · ${entry!.faqs} FAQs · ${entry!.indexedAt.slice(0, 10)})`
      );
      skipped++;
      continue;
    }

    console.log(`  🔄 [${mode}] ${label} — reason: ${reasons.join(', ')}`);
    if (dryRun) { indexed++; continue; }

    // 3. Index
    try {
      const stats = await indexKnowledgeFile(content, file, mode, {
        skipRewrite: process.env.SKIP_REWRITE === 'true',
      });

      manifest[key] = { hash, indexedAt: new Date().toISOString(), chunks: stats.chunks, faqs: stats.faqs };
      saveManifest(manifest);

      totalTokens.prompt     += stats.tokens.prompt;
      totalTokens.completion += stats.tokens.completion;
      totalTokens.total      += stats.tokens.total;

      // Invalidate cache so subsequent entries for same mode see updated state
      collectionStateCache.set(mode, true);

      console.log(
        `  ✅ [${mode}] ${label} — ${stats.chunks} chunks · ${stats.faqs} FAQs · ${(stats.elapsed / 1000).toFixed(1)}s · 🧠 ${stats.tokens.total.toLocaleString()} tokens`
      );
      indexed++;
    } catch (err) {
      console.error(`  ❌ [${mode}] ${label} — failed:`, err);
      failed++;
    }
  }

  console.log(
    `\n📊  ${indexed} indexed · ${skipped} skipped · ${failed} failed` +
    (dryRun ? '  (dry run — nothing written)' : '') +
    (indexed > 0 ? `\n🧠  Tokens — prompt: ${totalTokens.prompt.toLocaleString()} | completion: ${totalTokens.completion.toLocaleString()} | total: ${totalTokens.total.toLocaleString()}` : '')
  );
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
