import { qdrantClient, COLLECTIONS, EMBEDDING_DIM, INFERENCE_MODEL, type ServiceMode } from '@/lib/qdrant';
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
      const info = await qdrantClient.getCollection(collectionName);
      const existingDim = (info.config?.params?.vectors as { size?: number } | undefined)?.size;
      if (existingDim && existingDim !== EMBEDDING_DIM) {
        console.log(`⚠️  Collection "${collectionName}" has dim ${existingDim}, expected ${EMBEDDING_DIM} — recreating…`);
        await qdrantClient.deleteCollection(collectionName);
        await qdrantClient.createCollection(collectionName, { vectors: { size: EMBEDDING_DIM, distance: 'Cosine' } });
        console.log(`✅ Recreated collection "${collectionName}" (dim ${EMBEDDING_DIM}).`);
      } else {
        console.log(`Collection "${collectionName}" already exists (dim ${existingDim ?? '?'}).`);
      }
    } catch {
      await qdrantClient.createCollection(collectionName, { vectors: { size: EMBEDDING_DIM, distance: 'Cosine' } });
      console.log(`Created collection "${collectionName}" (dim ${EMBEDDING_DIM}).`);
    }
  }
}

/**
 * Upserts document chunks into Qdrant.
 */
export async function upsertDocuments(chunks: DocumentChunk[], mode: ServiceMode): Promise<void> {
  const collection = COLLECTIONS[mode].documents;
  console.log(`[DB SEND] Upserting ${chunks.length} doc chunks → "${collection}" via inference`);

  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const points = batch.map(chunk => ({
      id: chunk.id,
      // Qdrant server-side inference — no external embedding call needed
      vector: { text: `${chunk.title}\n${chunk.content}`, model: INFERENCE_MODEL } as unknown as number[],
      payload: { title: chunk.title, content: chunk.content, source: chunk.source },
    }));
    await qdrantClient.upsert(collection, { points, wait: true });
    console.log(`[DB SEND] ✓ Upserted ${batch.length} docs to "${collection}"`);
  }
}

/**
 * Upserts FAQ pairs into Qdrant (embedding the question text).
 */
export async function upsertFAQs(faqs: FAQPair[], mode: ServiceMode): Promise<void> {
  const collection = COLLECTIONS[mode].faqs;
  console.log(`[DB SEND] Upserting ${faqs.length} FAQ pairs → "${collection}" via inference`);

  const BATCH = 50;
  for (let i = 0; i < faqs.length; i += BATCH) {
    const batch = faqs.slice(i, i + BATCH);
    const points = batch.map(faq => ({
      id: faq.id,
      vector: { text: faq.question, model: INFERENCE_MODEL } as unknown as number[],
      payload: { question: faq.question, answer: faq.answer, sourceChunkId: faq.sourceChunkId },
    }));
    await qdrantClient.upsert(collection, { points, wait: true });
    console.log(`[DB SEND] ✓ Upserted ${batch.length} FAQs to "${collection}"`);
  }
}

/**
 * Dense vector search over a collection.
 */
export async function denseSearch(
  query: string,
  collection: string,
  topK = 10
): Promise<SearchResult[]> {
  const response = await qdrantClient.query(collection, {
    query: { text: query, model: INFERENCE_MODEL },
    limit: topK,
    with_payload: true,
  });
  const results = response.points;
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
