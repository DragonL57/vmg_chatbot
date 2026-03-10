import { randomUUID } from 'crypto';
import { getIndexingProvider } from '@core/lib/providers';
import {
  CHUNK_REWRITER_PROMPT,
  TITLE_ASSIGNER_PROMPT,
  FAQ_CREATOR_PROMPT,
  FAQ_EXPANDER_PROMPT,
} from '@core/prompts/uras';
import {
  ensureCollections,
  upsertDocuments,
  upsertFAQs,
  type DocumentChunk,
  type FAQPair,
} from './qdrant.service';
import { safeJsonParse } from '@core/lib/utils';
import type { ServiceMode } from '@core/lib/qdrant';
import type { FAQGeneration, FAQExpansion } from '@core/types/indexing';

const DELAY_MS = 500; // Rate-limit safety between LLM calls in sequential paths
const MAX_RETRIES = 4;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let delay = 2000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit = (err as { status?: number })?.status === 429
        || (err as { message?: string })?.message?.includes('429')
        || (err as { message?: string })?.message?.includes('Rate limit');
      if (isRateLimit && attempt < MAX_RETRIES) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// ─── TOKEN ACCUMULATOR ───────────────────────────────────────────────────────

export interface TokenAccum {
  prompt: number;
  completion: number;
  total: number;
}

function addUsage(accum: TokenAccum, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null | undefined) {
  accum.prompt     += usage?.prompt_tokens     ?? 0;
  accum.completion += usage?.completion_tokens ?? 0;
  accum.total      += usage?.total_tokens      ?? 0;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simple concurrency limiter — at most `limit` async tasks run simultaneously.
 */
function pLimit(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (queue.length > 0 && active < limit) {
      active++;
      queue.shift()!();
    }
  };
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn().then(resolve, reject).finally(() => { active--; next(); });
      });
      next();
    });
  };
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

async function rewriteChunk(chunk: string, fullContext: string, accum: TokenAccum): Promise<string> {
  const contextHint = fullContext.slice(0, 300); // Brief document context
  try {
    const { client, model, extraBody } = getIndexingProvider();
    const res = await withRetry(() => client.chat.completions.create({
      model,
      stream: false as const,
      messages: [
        { role: 'system', content: CHUNK_REWRITER_PROMPT },
        {
          role: 'user',
          content: `Ngữ cảnh tài liệu:\n${contextHint}\n\n---\nĐoạn cần viết lại:\n${chunk}`,
        },
      ],
      ...(extraBody ? { extra_body: extraBody } : {}),
    }));
    addUsage(accum, res.usage);
    return (res.choices[0].message.content ?? chunk).trim();
  } catch {
    return chunk; // Fallback: keep original
  }
}

// ─── PHASE 1: TITLE ASSIGNER ─────────────────────────────────────────────────

async function assignTitle(chunk: string, accum: TokenAccum): Promise<string> {
  // Try to extract existing header first (## Title or ### Title)
  const headerMatch = chunk.match(/^#{2,3}\s+(.+)/m);
  if (headerMatch?.[1]) {
    return headerMatch[1].trim().slice(0, 80);
  }

  try {
    const { client, model, extraBody } = getIndexingProvider();
    const res = await withRetry(() => client.chat.completions.create({
      model,
      stream: false as const,
      messages: [
        { role: 'system', content: TITLE_ASSIGNER_PROMPT },
        { role: 'user', content: `Đoạn văn bản:\n${chunk.slice(0, 600)}` },
      ],
      ...(extraBody ? { extra_body: extraBody } : {}),
    }));
    addUsage(accum, res.usage);
    return (res.choices[0].message.content ?? 'Thông tin VMG').trim().slice(0, 80);
  } catch {
    return 'Thông tin VMG';
  }
}

// ─── PHASE 2: FAQ CREATOR ────────────────────────────────────────────────────

async function createFAQs(chunk: DocumentChunk, accum: TokenAccum): Promise<Array<{ question: string; answer: string }>> {
  try {
    const { client, model, extraBody } = getIndexingProvider();
    const res = await withRetry(() => client.chat.completions.create({
      model,
      stream: false as const,
      messages: [
        { role: 'system', content: FAQ_CREATOR_PROMPT },
        {
          role: 'user',
          content: `Tiêu đề: ${chunk.title}\n\nNội dung:\n${chunk.content}`,
        },
      ],
      ...(extraBody ? { extra_body: extraBody } : {}),
    }));
    addUsage(accum, res.usage);
    const content = res.choices[0].message.content ?? '{}';
    const parsed = safeJsonParse<FAQGeneration>(content);
    return parsed?.pairs ?? [];
  } catch (err) {
    console.warn(`  [FAQ] createFAQs failed: ${(err as Error)?.message?.slice(0, 120)}`);
    return [];
  }
}

// ─── PHASE 2: FAQ EXPANDER ───────────────────────────────────────────────────

async function expandFAQ(question: string, accum: TokenAccum): Promise<string[]> {
  try {
    const { client, model, extraBody } = getIndexingProvider();
    const res = await withRetry(() => client.chat.completions.create({
      model,
      stream: false as const,
      messages: [
        { role: 'system', content: FAQ_EXPANDER_PROMPT },
        { role: 'user', content: `Câu hỏi gốc: ${question}` },
      ],
      ...(extraBody ? { extra_body: extraBody } : {}),
    }));
    addUsage(accum, res.usage);
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
  tokens: TokenAccum;
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
  const tokens: TokenAccum = { prompt: 0, completion: 0, total: 0 };
  console.log(`\n📚 Indexing "${sourceFile}" as mode="${mode}"…`);

  await ensureCollections(mode);

  // ── Phase 1: Chunk-and-Title (parallel, concurrency=5) ─────────────────────
  console.log('  Phase 1: Chunking…');
  const rawChunks = semanticChunk(markdown);
  console.log(`  → ${rawChunks.length} raw chunks`);

  const limit1 = pLimit(3);
  const documentChunks: DocumentChunk[] = await Promise.all(
    rawChunks.map((raw, i) =>
      limit1(async () => {
        let content = raw;
        if (!options.skipRewrite) {
          content = await rewriteChunk(raw, markdown.slice(0, 500), tokens);
        }
        const title = await assignTitle(content, tokens);
        console.log(`  [Chunk ${i + 1}/${rawChunks.length}] title="${title.slice(0, 80)}" (${content.length} chars)`);
        return { id: randomUUID(), title, content, source: sourceFile } as DocumentChunk;
      })
    )
  );

  console.log(`\n  Upserting ${documentChunks.length} document chunks to Qdrant…`);
  for (let i = 0; i < documentChunks.length; i += 20) {
    await upsertDocuments(documentChunks.slice(i, i + 20), mode);
  }
  console.log('  ✅ Phase 1 done.');

  // ── Phase 2: Ask-and-Augment (parallel per chunk, concurrency=4) ─────────────
  console.log('  Phase 2: Generating FAQs…');

  const limit2 = pLimit(1);
  const perChunkFAQs: FAQPair[][] = await Promise.all(
    documentChunks.map((chunk, i) =>
      limit2(async () => {
        const pairs = await createFAQs(chunk, tokens);
        await sleep(DELAY_MS); // pace between chunks

        // Expand all variants sequentially to avoid burst
        const expandLimit = pLimit(2);
        const expanded = await Promise.all(
          pairs.map(pair =>
            expandLimit(async () => {
              const variants = await expandFAQ(pair.question, tokens);
              return [pair, ...variants.map(v => ({ question: v, answer: pair.answer }))] as Array<{ question: string; answer: string }>;
            })
          )
        );

        const chunkFAQs: FAQPair[] = expanded.flat().map(p => ({
          id: randomUUID(),
          question: p.question,
          answer: p.answer,
          sourceChunkId: chunk.id,
        }));

        console.log(
          `  [Chunk ${i + 1}/${documentChunks.length}] "${chunk.title.slice(0, 50)}" → ${pairs.length} FAQs × ${pairs.length > 0 ? Math.round((chunkFAQs.length - pairs.length) / pairs.length + 1) : 0} variants = ${chunkFAQs.length} total`
        );
        return chunkFAQs;
      })
    )
  );

  const allFAQs = perChunkFAQs.flat();

  console.log(`\n  Upserting ${allFAQs.length} FAQ pairs to Qdrant…`);
  for (let i = 0; i < allFAQs.length; i += 50) {
    await upsertFAQs(allFAQs.slice(i, i + 50), mode);
  }
  console.log('  ✅ Phase 2 done.');

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ Indexing complete: ${documentChunks.length} chunks, ${allFAQs.length} FAQs in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`   Tokens used — prompt: ${tokens.prompt.toLocaleString()} | completion: ${tokens.completion.toLocaleString()} | total: ${tokens.total.toLocaleString()}`);

  return { chunks: documentChunks.length, faqs: allFAQs.length, elapsed, tokens };
}

