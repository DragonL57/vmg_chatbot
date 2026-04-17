import { randomUUID } from 'crypto';
import { getIndexingProvider } from '@core/lib/providers';
import {
  DOCUMENT_REWRITER_PROMPT,
  KNOWLEDGE_TITLE_PROMPT,
} from '@core/prompts/rag-agents';
import {
  ensureCollections,
  upsertDocuments,
  deleteBySource,
  type DocumentChunk,
} from './qdrant.service';
import { safeJsonParse } from '@core/lib/utils';
import pLimit from 'p-limit';
import { upsertKnowledgeFile } from './supabase.service';

const BASE_OP_DELAY = 1000; // 1s delay for steadier flow
const MAX_RETRIES = 10;

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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let delay = 5000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      await sleep(BASE_OP_DELAY);
      return result;
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? '';
      const status = (err as { status?: number })?.status;
      const isRateLimit = status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const jitter = Math.random() * 2000;
        console.warn(`  [Retry ${attempt}/${MAX_RETRIES}] LLM Rate limited, cooling down...`);
        await sleep(delay + jitter);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Appends a log line to the database record for real-time UI tracking.
 */
async function dbLog(fileId: string, filename: string, mode: string, message: string, progress: number, logs: string[]) {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const newLog = `[${timestamp}] ${message}`;
  const updatedLogs = [...logs, newLog].slice(-50); // Keep last 50
  
  await upsertKnowledgeFile({
    id: fileId,
    filename,
    mode,
    status: 'indexing',
    progress,
    logs: updatedLogs
  }).catch(err => console.error('[DB LOG ERROR]', err));
  
  return updatedLogs;
}

// ─── PHASE 1: SEMANTIC CHUNKING ──────────────────────────────────────────────

export function hierarchicalChunk(markdown: string): Array<{ child: string; parent: string }> {
  const MIN_PARENT_SIZE = 1000;
  const CHILD_SIZE = 1000;
  const CHILD_OVERLAP = 100;

  const rawSections = markdown.split(/\n(?=##?\s)/);
  const processedParents: string[] = [];
  let buffer = "";

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    if (buffer.length + trimmed.length < MIN_PARENT_SIZE) {
      buffer += (buffer ? "\n\n" : "") + trimmed;
    } else {
      if (buffer) processedParents.push(buffer);
      buffer = trimmed;
    }
  }
  if (buffer) processedParents.push(buffer);

  const results: Array<{ child: string; parent: string }> = [];
  for (const parent of processedParents) {
    let start = 0;
    while (start < parent.length) {
      let end = start + CHILD_SIZE;
      if (end < parent.length) {
        const nextSpace = parent.indexOf(" ", end);
        if (nextSpace !== -1 && nextSpace < end + 20) end = nextSpace;
      }
      const child = parent.slice(start, end).trim();
      if (child.length > 50) results.push({ child, parent });
      start = end - CHILD_OVERLAP;
      if (start >= parent.length - CHILD_OVERLAP) break;
    }
  }
  return results;
}

// ─── PHASE 1: AGENTS ─────────────────────────────────────────────────────────

async function rewriteChunk(chunk: string, fullContext: string, accum: TokenAccum): Promise<string> {
  const contextHint = fullContext.slice(0, 300);
  const { client, model, extraBody } = getIndexingProvider();
  const res = await withRetry(() => client.chat.completions.create({
    model,
    stream: false as const,
    messages: [
      { role: 'system', content: DOCUMENT_REWRITER_PROMPT },
      { role: 'user', content: `Context: ${contextHint}\n\nContent: ${chunk}` },
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  }));
  addUsage(accum, res.usage);
  return (res.choices[0].message.content ?? chunk).trim();
}

async function assignTitle(chunk: string, accum: TokenAccum): Promise<string> {
  const { client, model, extraBody } = getIndexingProvider();
  const res = await withRetry(() => client.chat.completions.create({
    model,
    stream: false as const,
    messages: [
      { role: 'system', content: KNOWLEDGE_TITLE_PROMPT },
      { role: 'user', content: chunk.slice(0, 600) },
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  }));
  addUsage(accum, res.usage);
  return (res.choices[0].message.content ?? 'Knowledge Node').trim().slice(0, 80);
}

// ─── MAIN INDEXING PIPELINE ──────────────────────────────────────────────────

export interface IndexingStats {
  chunks: number;
  elapsed: number;
  tokens: TokenAccum;
}

export async function indexKnowledgeFile(
  markdown: string,
  sourceFile: string,
  collectionName: string,
  fileId: string,
  options: { skipRewrite?: boolean } = {}
): Promise<IndexingStats> {
  const startTime = Date.now();
  const tokens: TokenAccum = { prompt: 0, completion: 0, total: 0 };
  let currentLogs: string[] = [];

  currentLogs = await dbLog(fileId, sourceFile, collectionName, `Bắt đầu xử lý: ${sourceFile}`, 5, currentLogs);
  await ensureCollections(collectionName);
  currentLogs = await dbLog(fileId, sourceFile, collectionName, `Đã kết nối Qdrant: ${collectionName}`, 10, currentLogs);

  const segments = hierarchicalChunk(markdown);
  currentLogs = await dbLog(fileId, sourceFile, collectionName, `Đã phân tách ${segments.length} đoạn hội thoại`, 15, currentLogs);

  const limit = pLimit(2);
  let processedCount = 0;

  const documentChunks: DocumentChunk[] = await Promise.all(
    segments.map((seg, i) =>
      limit(async () => {
        let content = seg.child;
        if (!options.skipRewrite) {
          content = await rewriteChunk(seg.child, seg.parent, tokens);
        }
        const title = await assignTitle(content, tokens);
        
        processedCount++;
        const progress = 15 + Math.floor((processedCount / segments.length) * 70);
        if (processedCount % 5 === 0 || processedCount === segments.length) {
          currentLogs = await dbLog(fileId, sourceFile, collectionName, `Đã xử lý ${processedCount}/${segments.length} đoạn...`, progress, currentLogs);
        }

        return { 
          id: randomUUID(), 
          title, 
          content, 
          source: sourceFile,
          parentContent: seg.parent 
        } as DocumentChunk;
      })
    )
  );

  currentLogs = await dbLog(fileId, sourceFile, collectionName, `Đang đẩy dữ liệu lên Vector Database...`, 90, currentLogs);
  for (let i = 0; i < documentChunks.length; i += 20) {
    await upsertDocuments(documentChunks.slice(i, i + 20), collectionName);
  }

  const elapsed = Date.now() - startTime;
  await dbLog(fileId, sourceFile, collectionName, `Hoàn tất! ${documentChunks.length} nodes đã được index.`, 100, currentLogs);

  return { chunks: documentChunks.length, elapsed, tokens };
}

export async function removeKnowledgeFile(sourceFile: string, collectionName: string): Promise<void> {
  await deleteBySource(sourceFile, collectionName);
}
