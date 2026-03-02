import { randomUUID } from 'crypto';
import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import {
  CHUNK_REWRITER_PROMPT,
  TITLE_ASSIGNER_PROMPT,
  FAQ_CREATOR_PROMPT,
  FAQ_EXPANDER_PROMPT,
} from '@/prompts/uras';
import {
  ensureCollections,
  upsertDocuments,
  upsertFAQs,
  type DocumentChunk,
  type FAQPair,
} from './qdrant.service';
import { safeJsonParse } from '@/lib/utils';
import type { ServiceMode } from '@/lib/qdrant';
import type { FAQGeneration, FAQExpansion } from '@/types/indexing';

const DELAY_MS = 300; // Rate-limit safety between LLM calls

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── PHASE 1: SEMANTIC CHUNKING ──────────────────────────────────────────────

/**
 * Splits a markdown document into semantic chunks using natural boundaries:
 * `---` separators and `###` / `##` headers.
 * Groups small fragments to meet minimum chunk size.
 */
export function semanticChunk(markdown: string, minChars = 150, maxChars = 2500): string[] {
  // Split on section boundaries
  const rawSections = markdown.split(/\n(?=###?\s|\n---)/);
  const chunks: string[] = [];
  let buffer = '';

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (buffer.length + trimmed.length <= maxChars) {
      buffer += (buffer ? '\n\n' : '') + trimmed;
    } else {
      if (buffer.length >= minChars) {
        chunks.push(buffer.trim());
      }
      buffer = trimmed;
    }
  }
  if (buffer.length >= minChars) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

// ─── PHASE 1: CHUNK REWRITER ─────────────────────────────────────────────────

async function rewriteChunk(chunk: string, fullContext: string): Promise<string> {
  const contextHint = fullContext.slice(0, 300); // Brief document context
  try {
    const res = await poe.chat.completions.create({
      model: DEFAULT_POE_MODEL,
      messages: [
        { role: 'system', content: CHUNK_REWRITER_PROMPT },
        {
          role: 'user',
          content: `Ngữ cảnh tài liệu:\n${contextHint}\n\n---\nĐoạn cần viết lại:\n${chunk}`,
        },
      ],
    });
    return (res.choices[0].message.content ?? chunk).trim();
  } catch {
    return chunk; // Fallback: keep original
  }
}

// ─── PHASE 1: TITLE ASSIGNER ─────────────────────────────────────────────────

async function assignTitle(chunk: string): Promise<string> {
  // Try to extract existing header first (### [Category] Title)
  const headerMatch = chunk.match(/^###?\s*\[?[^\]]*\]?\s*(.+)/m);
  if (headerMatch?.[1]) {
    return headerMatch[1].trim().slice(0, 80);
  }

  try {
    const res = await poe.chat.completions.create({
      model: DEFAULT_POE_MODEL,
      messages: [
        { role: 'system', content: TITLE_ASSIGNER_PROMPT },
        { role: 'user', content: `Đoạn văn bản:\n${chunk.slice(0, 600)}` },
      ],
    });
    return (res.choices[0].message.content ?? 'Thông tin VMG').trim().slice(0, 80);
  } catch {
    return 'Thông tin VMG';
  }
}

// ─── PHASE 2: FAQ CREATOR ────────────────────────────────────────────────────

async function createFAQs(chunk: DocumentChunk): Promise<Array<{ question: string; answer: string }>> {
  try {
    const res = await poe.chat.completions.create({
      model: DEFAULT_POE_MODEL,
      messages: [
        { role: 'system', content: FAQ_CREATOR_PROMPT },
        {
          role: 'user',
          content: `Tiêu đề: ${chunk.title}\n\nNội dung:\n${chunk.content}`,
        },
      ],
    });
    const content = res.choices[0].message.content ?? '{}';
    const parsed = safeJsonParse<FAQGeneration>(content);
    return parsed?.pairs ?? [];
  } catch {
    return [];
  }
}

// ─── PHASE 2: FAQ EXPANDER ───────────────────────────────────────────────────

async function expandFAQ(question: string): Promise<string[]> {
  try {
    const res = await poe.chat.completions.create({
      model: DEFAULT_POE_MODEL,
      messages: [
        { role: 'system', content: FAQ_EXPANDER_PROMPT },
        { role: 'user', content: `Câu hỏi gốc: ${question}` },
      ],
    });
    const content = res.choices[0].message.content ?? '{}';
    const parsed = safeJsonParse<FAQExpansion>(content);
    return parsed?.variations ?? [];
  } catch {
    return [];
  }
}

// ─── MAIN INDEXING PIPELINE ──────────────────────────────────────────────────

export interface IndexingStats {
  chunks: number;
  faqs: number;
  elapsed: number;
}

/**
 * Full two-phase indexing pipeline for a knowledge file.
 *
 * Phase 1 (Chunk-and-Title): chunk → rewrite → title assign → upsert to Qdrant docs
 * Phase 2 (Ask-and-Augment): for each chunk → create FAQs → expand → upsert to Qdrant FAQs
 */
export async function indexKnowledgeFile(
  markdown: string,
  sourceFile: string,
  mode: ServiceMode,
  options: { skipRewrite?: boolean } = {}
): Promise<IndexingStats> {
  const startTime = Date.now();
  console.log(`\n📚 Indexing "${sourceFile}" as mode="${mode}"…`);

  await ensureCollections(mode);

  // ── Phase 1: Chunk-and-Title ────────────────────────────────────────────────
  console.log('  Phase 1: Chunking…');
  const rawChunks = semanticChunk(markdown);
  console.log(`  → ${rawChunks.length} raw chunks`);

  const documentChunks: DocumentChunk[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const raw = rawChunks[i];
    process.stdout.write(`  Chunk ${i + 1}/${rawChunks.length}…\r`);

    let content = raw;
    if (!options.skipRewrite) {
      content = await rewriteChunk(raw, markdown.slice(0, 500));
      await sleep(DELAY_MS);
    }

    const title = await assignTitle(content);
    await sleep(DELAY_MS);

    console.log(`  [Chunk ${i + 1}/${rawChunks.length}] title="${title}" (${content.length} chars)`);

    documentChunks.push({
      id: randomUUID(),
      title,
      content,
      source: sourceFile,
    });
  }

  console.log(`\n  Upserting ${documentChunks.length} document chunks to Qdrant…`);
  // Upsert in batches of 20 to avoid memory/network issues
  for (let i = 0; i < documentChunks.length; i += 20) {
    await upsertDocuments(documentChunks.slice(i, i + 20), mode);
  }
  console.log('  ✅ Phase 1 done.');

  // ── Phase 2: Ask-and-Augment ────────────────────────────────────────────────
  console.log('  Phase 2: Generating FAQs…');
  const allFAQs: FAQPair[] = [];

  for (let i = 0; i < documentChunks.length; i++) {
    const chunk = documentChunks[i];

    const pairs = await createFAQs(chunk);
    await sleep(DELAY_MS);

    let chunkFAQCount = 0;
    for (const pair of pairs) {
      // Original FAQ
      allFAQs.push({
        id: randomUUID(),
        question: pair.question,
        answer: pair.answer,
        sourceChunkId: chunk.id,
      });
      chunkFAQCount++;

      // Paraphrased variants
      const variants = await expandFAQ(pair.question);
      await sleep(DELAY_MS);

      for (const variant of variants) {
        allFAQs.push({
          id: randomUUID(),
          question: variant,
          answer: pair.answer,
          sourceChunkId: chunk.id,
        });
        chunkFAQCount++;
      }
    }
    console.log(`  [Chunk ${i + 1}/${documentChunks.length}] "${chunk.title.slice(0, 50)}" → ${pairs.length} FAQs × ${pairs.length > 0 ? Math.round(chunkFAQCount / pairs.length) : 0} variants = ${chunkFAQCount} total`);
  }

  console.log(`\n  Upserting ${allFAQs.length} FAQ pairs to Qdrant…`);
  for (let i = 0; i < allFAQs.length; i += 50) {
    await upsertFAQs(allFAQs.slice(i, i + 50), mode);
  }
  console.log('  ✅ Phase 2 done.');

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ Indexing complete: ${documentChunks.length} chunks, ${allFAQs.length} FAQs in ${(elapsed / 1000).toFixed(1)}s`);

  return { chunks: documentChunks.length, faqs: allFAQs.length, elapsed };
}
