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
  const updatedLogs = [...logs, newLog].slice(-100); // Keep last 100 for "raw" feel
  
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

  currentLogs = await dbLog(fileId, sourceFile, collectionName, `INITIALIZING: ${sourceFile}`, 2, currentLogs);
  await ensureCollections(collectionName);
  currentLogs = await dbLog(fileId, sourceFile, collectionName, `CONNECTED: Qdrant collection "${collectionName}" ready`, 5, currentLogs);

  const segments = hierarchicalChunk(markdown);
  currentLogs = await dbLog(fileId, sourceFile, collectionName, `CHUNKING: Split into ${segments.length} semantic segments`, 10, currentLogs);

  const limit = pLimit(2);
  let processedCount = 0;

  const documentChunks: DocumentChunk[] = await Promise.all(
    segments.map((seg, i) =>
      limit(async () => {
        const chunkIndex = i + 1;
        currentLogs = await dbLog(fileId, sourceFile, collectionName, `PROCESSING: Chunk [${chunkIndex}/${segments.length}] rewriting...`, 10, currentLogs);

        let content = seg.child;
        if (!options.skipRewrite) {
          content = await rewriteChunk(seg.child, seg.parent, tokens);
        }
        
        const title = await assignTitle(content, tokens);
        
        processedCount++;
        const progress = 10 + Math.floor((processedCount / segments.length) * 75);
        
        currentLogs = await dbLog(fileId, sourceFile, collectionName, `COMPLETED: Chunk [${chunkIndex}/${segments.length}] — "${title}"`, progress, currentLogs);

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

  currentLogs = await dbLog(fileId, sourceFile, collectionName, `UPLOADING: Sending ${documentChunks.length} points to Qdrant...`, 90, currentLogs);
  
  const BATCH_SIZE = 20;
  for (let i = 0; i < documentChunks.length; i += BATCH_SIZE) {
    const batch = documentChunks.slice(i, i + BATCH_SIZE);
    await upsertDocuments(batch, collectionName);
    currentLogs = await dbLog(fileId, sourceFile, collectionName, `SYNCED: Batch [${i}-${i+batch.length}] pushed to vector store`, 90 + Math.floor((i/documentChunks.length)*10), currentLogs);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const tokenSummary = `Tokens: ${tokens.total} (P: ${tokens.prompt} | C: ${tokens.completion})`;
  
  await dbLog(fileId, sourceFile, collectionName, `SUCCESS: Indexing finished in ${elapsed}s. ${tokenSummary}`, 100, currentLogs);

  return { chunks: documentChunks.length, elapsed: Number(elapsed), tokens };
}

export async function removeKnowledgeFile(sourceFile: string, collectionName: string): Promise<void> {
  await deleteBySource(sourceFile, collectionName);
}
