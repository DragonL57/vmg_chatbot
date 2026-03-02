import { qdrantClient, COLLECTIONS, EMBEDDING_DIM, type ServiceMode } from '@/lib/qdrant';
import { embed } from '@/lib/embeddings';
import { bm25Search, reciprocalRankFusion } from '@/lib/bm25';

export interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  source: string; // filename
}

export interface FAQPair {
  id: string;
  question: string;
  answer: string;
  sourceChunkId: string;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Ensures required collections exist in Qdrant with correct vector config.
 */
export async function ensureCollections(mode: ServiceMode): Promise<void> {
  const { documents, faqs } = COLLECTIONS[mode];

  for (const collectionName of [documents, faqs]) {
    try {
      await qdrantClient.getCollection(collectionName);
      console.log(`Collection "${collectionName}" already exists.`);
    } catch {
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: EMBEDDING_DIM,
          distance: 'Cosine',
        },
      });
      console.log(`Created collection "${collectionName}".`);
    }
  }
}

/**
 * Upserts document chunks into Qdrant.
 */
export async function upsertDocuments(chunks: DocumentChunk[], mode: ServiceMode): Promise<void> {
  const collection = COLLECTIONS[mode].documents;
  console.log(`[DB SEND] Embedding ${chunks.length} document chunks → "${collection}"`);
  const texts = chunks.map(c => `${c.title}\n${c.content}`);
  const { embedBatch } = await import('@/lib/embeddings');
  const vectors = await embedBatch(texts);

  const points = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: vectors[i],
    payload: {
      title: chunk.title,
      content: chunk.content,
      source: chunk.source,
    },
  }));

  await qdrantClient.upsert(collection, { points });
  console.log(`[DB SEND] ✓ Upserted ${points.length} docs to "${collection}"`);
}

/**
 * Upserts FAQ pairs into Qdrant (embedding the question text).
 */
export async function upsertFAQs(faqs: FAQPair[], mode: ServiceMode): Promise<void> {
  const collection = COLLECTIONS[mode].faqs;
  console.log(`[DB SEND] Embedding ${faqs.length} FAQ pairs → "${collection}"`);
  const texts = faqs.map(f => f.question);
  const { embedBatch } = await import('@/lib/embeddings');
  const vectors = await embedBatch(texts);

  const points = faqs.map((faq, i) => ({
    id: faq.id,
    vector: vectors[i],
    payload: {
      question: faq.question,
      answer: faq.answer,
      sourceChunkId: faq.sourceChunkId,
    },
  }));

  await qdrantClient.upsert(collection, { points });
  console.log(`[DB SEND] ✓ Upserted ${points.length} FAQs to "${collection}"`);
}

/**
 * Dense vector search over a collection.
 */
export async function denseSearch(
  query: string,
  collection: string,
  topK = 10
): Promise<SearchResult[]> {
  const queryVector = await embed(query);
  const results = await qdrantClient.search(collection, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });
  console.log(`[DB RETRIEVE] Dense "${collection}" query="${query.slice(0, 60)}" → ${results.length} hits, top score: ${results[0]?.score.toFixed(3) ?? 'n/a'}`);
  return results.map(r => ({
    id: String(r.id),
    score: r.score,
    payload: r.payload as Record<string, unknown>,
  }));
}

/**
 * Hybrid search (dense + BM25 + RRF) for document retrieval.
 * Fetches all documents for BM25, then fuses with dense search results.
 */
export async function hybridDocumentSearch(
  query: string,
  mode: ServiceMode,
  topK = 5
): Promise<SearchResult[]> {
  const collection = COLLECTIONS[mode].documents;

  // Dense search (over-fetch for RRF candidate pool)
  const denseResults = await denseSearch(query, collection, topK * 3);

  // Fetch full text for BM25 (from dense candidates to avoid loading all)
  const bm25Docs = denseResults.map(r => ({
    id: r.id,
    text: `${r.payload.title ?? ''} ${r.payload.content ?? ''}`,
  }));

  // BM25 search over candidate pool
  const bm25Results = bm25Search(query, bm25Docs, topK * 3);

  // Build ranked lists for RRF
  const denseRanked = denseResults.map(r => r.id);
  const bm25Ranked = bm25Results.map(r => r.id);

  // Apply RRF
  const fusedIds = reciprocalRankFusion([denseRanked, bm25Ranked]).slice(0, topK);

  // Map back to full results
  const resultMap = new Map(denseResults.map(r => [r.id, r]));
  const fused = fusedIds
    .map(id => resultMap.get(id))
    .filter((r): r is SearchResult => r !== undefined);
  console.log(`[DB RETRIEVE] Hybrid RRF "${collection}" query="${query.slice(0, 60)}" → ${fused.length} results, top score: ${fused[0]?.score.toFixed(3) ?? 'n/a'}`);
  fused.forEach((r, i) => console.log(`  [${i + 1}] score=${r.score.toFixed(3)} title="${String(r.payload.title ?? '').slice(0, 50)}"`));
  return fused;
}

/**
 * FAQ search (dense only, FAQs are already normalized).
 */
export async function faqSearch(
  query: string,
  mode: ServiceMode,
  topK = 5
): Promise<SearchResult[]> {
  const results = await denseSearch(query, COLLECTIONS[mode].faqs, topK);
  console.log(`[DB RETRIEVE] FAQ search top hits:`);
  results.slice(0, 3).forEach((r, i) => console.log(`  [${i + 1}] score=${r.score.toFixed(3)} q="${String(r.payload.question ?? '').slice(0, 60)}"`));
  return results;
}

/**
 * Checks if a collection has any indexed data.
 */
export async function isIndexed(mode: ServiceMode): Promise<boolean> {
  try {
    const { documents } = COLLECTIONS[mode];
    const info = await qdrantClient.getCollection(documents);
    return (info.points_count ?? 0) > 0;
  } catch {
    return false;
  }
}
