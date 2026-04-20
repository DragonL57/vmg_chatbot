import { randomUUID } from 'crypto';
import pLimit from 'p-limit';
import { getIndexingProvider } from '@core/lib/providers';
import {
  DOCUMENT_REWRITER_PROMPT,
  KNOWLEDGE_TITLE_PROMPT,
  FAQ_CREATOR_PROMPT,
} from '@core/prompts/rag-agents';
import {
  ensureCollections,
  upsertDocuments,
  deleteBySource,
  type DocumentChunk,
} from './qdrant.service';
import { qdrantClient } from '@core/lib/qdrant';
import { safeJsonParse } from '@core/lib/utils';
import { 
  upsertKnowledgeFile, 
  listKnowledgeFiles, 
  updateCollectionRecord, 
  listCollections 
} from './supabase.service';

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

export function hierarchicalChunk(markdown: string): Array<{ child: string; parent: string; header: string }> {
  const MIN_PARENT_SIZE = 1200; 
  const CHILD_SIZE = 500;       
  const CHILD_OVERLAP = 150;    

  const rawSections = markdown.split(/\n(?=#{1,3}\s)/);
  const processedParents: Array<{ text: string; header: string }> = [];
  let buffer = "";
  let currentHeader = "General";

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract header from the start of the section
    const headerMatch = trimmed.match(/^#{1,3}\s*(.*)/m);
    const sectionHeader = headerMatch ? headerMatch[1].trim() : currentHeader;
    
    if (trimmed.length >= MIN_PARENT_SIZE) {
      if (buffer) processedParents.push({ text: buffer, header: currentHeader });
      processedParents.push({ text: trimmed, header: sectionHeader });
      buffer = "";
      currentHeader = sectionHeader;
      continue;
    }

    if (buffer.length + trimmed.length < MIN_PARENT_SIZE) {
      buffer += (buffer ? "\n\n" : "") + trimmed;
    } else {
      if (buffer) processedParents.push({ text: buffer, header: currentHeader });
      buffer = trimmed;
      currentHeader = sectionHeader;
    }
  }
  if (buffer) processedParents.push({ text: buffer, header: currentHeader });

  const results: Array<{ child: string; parent: string; header: string }> = [];
  for (const parent of processedParents) {
    let start = 0;
    while (start < parent.text.length) {
      let end = start + CHILD_SIZE;

      if (end < parent.text.length) {
        const nextBreak = parent.text.slice(end, end + 50).search(/[\n.]/);
        if (nextBreak !== -1) end += nextBreak + 1;
      }

      const childRaw = parent.text.slice(start, end).trim();
      if (childRaw.length > 50) {
        // Prepend header to child for better vector representation
        const childWithHeader = `[${parent.header}] ${childRaw}`;
        results.push({ child: childWithHeader, parent: parent.text, header: parent.header });
      }

      start = end - CHILD_OVERLAP;
      if (start >= parent.text.length - CHILD_OVERLAP) break;
    }
  }
  return results;
}

// ─── HELPERS & CORE LOGIC ───────────────────────────────────────────────────

export async function fetchFullFileContent(filename: string, collectionName: string): Promise<string> {
  const response = await qdrantClient.scroll(collectionName, {
    filter: {
      must: [{ key: 'source', match: { value: filename } }],
    },
    limit: 100, // Sufficient for most markdown files
    with_payload: true,
  });

  const parents = new Set<string>();
  response.points.forEach((p: any) => {
    if (p.payload?.parentContent) parents.add(p.payload.parentContent);
  });

  return Array.from(parents).join("\n\n");
}

export async function generateFileSummary(content: string, accum: TokenAccum): Promise<string> {
  // 1. Extract all headings to understand the structure
  const headings = content.match(/^#{1,3}\s.*$/gm) || [];
  const structure = headings.slice(0, 20).join("\n"); // Limit to first 20 headings

  // 2. Sample context at 0%, 25%, 50%, 75%, and 100% marks
  const sampleSize = 600;
  const length = content.length;
  const samples = [
    content.slice(0, sampleSize), // 0%
    content.slice(Math.floor(length * 0.25), Math.floor(length * 0.25) + sampleSize), // 25%
    content.slice(Math.floor(length * 0.5), Math.floor(length * 0.5) + sampleSize),   // 50%
    content.slice(Math.floor(length * 0.75), Math.floor(length * 0.75) + sampleSize), // 75%
    content.slice(Math.max(0, length - sampleSize)) // 100%
  ];

  const skeleton = `
STRUCTURE:
${structure}

SAMPLED SNIPPETS:
${samples.join("\n---\n")}
  `.trim();

  const { client, model, extraBody } = getIndexingProvider();
  const res = await withRetry(() => client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'Bạn là chuyên gia phân tích tài liệu. Dựa vào CẤU TRÚC và các ĐOẠN TRÍCH từ tài liệu sau, hãy viết tóm tắt tổng quan (2-3 câu) về nội dung chính. Tập trung vào chủ đề cốt lõi và mục đích của tài liệu.' },
      { role: 'user', content: skeleton },
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  }));
  addUsage(accum, res.usage);
  return (res.choices[0].message.content || 'No summary generated').trim();
}

export async function refreshCollectionDescription(collectionName: string, accum: TokenAccum) {
  const allFiles = await listKnowledgeFiles();
  const collectionFiles = allFiles.filter(f => f.mode === collectionName && f.status === 'completed');
  
  if (collectionFiles.length === 0) return;

  const summaries = collectionFiles.filter(f => f.summary).map(f => `- ${f.filename}: ${f.summary}`).join("\n");
  
  if (!summaries) return;

  const { client, model, extraBody } = getIndexingProvider();
  const res = await withRetry(() => client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'Dựa vào danh sách các tóm tắt tài liệu sau, hãy viết một mô tả tổng quan (khoảng 3-4 câu) về nội dung và phạm vi của kho tri thức này. Mô tả này sẽ giúp Agent định tuyến câu hỏi chính xác.' },
      { role: 'user', content: `Danh sách tài liệu:\n${summaries}` },
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  }));

  const description = res.choices[0].message.content || '';
  
  // Find collection ID to update
  const collections = await listCollections();
  const col = collections.find(c => c.qdrantName === collectionName);
  if (col) {
    await updateCollectionRecord(col.id, { description });
    console.log(`[Collection] Updated description for ${collectionName}`);
  }
}

export async function rewriteChunk(chunk: string, fullContext: string, accum: TokenAccum): Promise<string> {
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

export async function assignTitle(chunk: string, accum: TokenAccum): Promise<string> {
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

async function generateFAQs(chunk: string, accum: TokenAccum): Promise<string[]> {
  const { client, model, extraBody } = getIndexingProvider();
  const res = await withRetry(() => client.chat.completions.create({
    model,
    stream: false as const,
    response_format: { type: "json_object" },
    messages: [
      { role: 'system', content: FAQ_CREATOR_PROMPT },
      { role: 'user', content: chunk },
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  }));
  addUsage(accum, res.usage);
  try {
    const parsed = JSON.parse(res.choices[0].message.content || "{}");
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch (e) {
    return [];
  }
}

// ─── MAIN INDEXING PIPELINE ──────────────────────────────────────────────────

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

  currentLogs = await dbLog(fileId, sourceFile, collectionName, `URASYS START: ${sourceFile}`, 2, currentLogs);
  await ensureCollections(collectionName);

  const segments = hierarchicalChunk(markdown);
  currentLogs = await dbLog(fileId, sourceFile, collectionName, `CHUNKING: Split into ${segments.length} segments`, 5, currentLogs);

  const limit = pLimit(2);
  let processedCount = 0;

  const documentChunks: DocumentChunk[] = await Promise.all(
    segments.map((seg, i) =>
      limit(async () => {
        const chunkIndex = i + 1;
        
        // Phase 1: Context-Aware Rewriting
        currentLogs = await dbLog(fileId, sourceFile, collectionName, `[Phase 1] Rewriting Segment ${chunkIndex}...`, 10, currentLogs);
        const rewrittenContent = await rewriteChunk(seg.child, seg.parent, tokens);
        const title = await assignTitle(rewrittenContent, tokens);

        // Phase 2: Ask-and-Augment (FAQ Generation)
        currentLogs = await dbLog(fileId, sourceFile, collectionName, `[Phase 2] Generating FAQs for Segment ${chunkIndex}...`, 10, currentLogs);
        const faqs = await generateFAQs(rewrittenContent, tokens);
        
        // Final Unit: Title + FAQs + Content
        // Prepend FAQs to content so vector embedding captures the intents
        const searchOptimizedContent = `[INTENTS]: ${faqs.join("; ")}\n\n[CONTENT]: ${rewrittenContent}`;

        processedCount++;
        const progress = 10 + Math.floor((processedCount / segments.length) * 80);
        currentLogs = await dbLog(fileId, sourceFile, collectionName, `URASYS COMPLETE: Segment ${chunkIndex} Enriched`, progress, currentLogs);

        return { 
          id: randomUUID(), 
          title, 
          content: searchOptimizedContent, // This goes to vector
          source: sourceFile,
          parentContent: seg.parent 
        } as DocumentChunk;
      })
    )
  );

  currentLogs = await dbLog(fileId, sourceFile, collectionName, `UPLOADING: Syncing ${documentChunks.length} points to Qdrant...`, 95, currentLogs);
  
  const BATCH_SIZE = 15;
  for (let i = 0; i < documentChunks.length; i += BATCH_SIZE) {
    const batch = documentChunks.slice(i, i + BATCH_SIZE);
    await upsertDocuments(batch, collectionName);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summarization Step: High-level summary of the entire file
  currentLogs = await dbLog(fileId, sourceFile, collectionName, `SUMMARIZING: Generating file-level overview...`, 98, currentLogs);
  const fileSummary = await generateFileSummary(markdown, tokens);
  
  await upsertKnowledgeFile({
    id: fileId,
    filename: sourceFile,
    mode: collectionName,
    status: 'completed',
    progress: 100,
    summary: fileSummary,
    logs: currentLogs
  });

  // Dynamic Silo Update: Refresh the collection's description based on ALL its files
  await refreshCollectionDescription(collectionName, tokens);
  
  await dbLog(fileId, sourceFile, collectionName, `URASYS SUCCESS: Indexing finished in ${elapsed}s.`, 100, currentLogs);

  return { chunks: documentChunks.length, elapsed: Number(elapsed), tokens };
}

export async function removeKnowledgeFile(sourceFile: string, collectionName: string): Promise<void> {
  await deleteBySource(sourceFile, collectionName);
}

export interface IndexingStats {
  chunks: number;
  elapsed: number;
  tokens: TokenAccum;
}
