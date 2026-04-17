import { qdrantClient, EMBEDDING_DIM, INFERENCE_MODEL } from '@core/lib/qdrant';
import { env } from '@/env';
import { bm25Search, reciprocalRankFusion } from '@core/lib/bm25';

export interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  source: string; // filename
  parentContent?: string; // The larger context for better answering
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Ensures required collection exists in Qdrant with correct vector config and payload indices.
 */
export async function ensureCollections(collectionName: string): Promise<void> {
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

  // Ensure 'source' index exists for filtering/deletion
  try {
    await qdrantClient.createPayloadIndex(collectionName, {
      field_name: 'source',
      field_schema: 'keyword',
      wait: true,
    });
    console.log(`✅ Ensured "source" index on "${collectionName}"`);
  } catch (err) {
    // Index might already exist, which is fine
  }
}

/**
 * Upserts document chunks into Qdrant.
 */
export async function upsertDocuments(chunks: DocumentChunk[], collectionName: string): Promise<void> {
  console.log(`[DB SEND] Upserting ${chunks.length} doc chunks → "${collectionName}" via inference`);

  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const points = batch.map(chunk => ({
      id: chunk.id,
      // Qdrant server-side inference — no external embedding call needed
      vector: { text: `${chunk.title}\n${chunk.content}`, model: INFERENCE_MODEL } as unknown as number[],
      payload: { 
        title: chunk.title, 
        content: chunk.content, 
        source: chunk.source,
        parentContent: chunk.parentContent 
      },
    }));
    await qdrantClient.upsert(collectionName, { points, wait: true });
    console.log(`[DB SEND] ✓ Upserted ${batch.length} docs to "${collectionName}"`);
  }
}

/**
 * Dense vector search over a collection.
 */
export async function denseSearch(
  query: string,
  collectionName: string,
  topK = 10
): Promise<SearchResult[]> {
  const response = await qdrantClient.query(collectionName, {
    query: { text: query, model: INFERENCE_MODEL },
    limit: topK,
    with_payload: true,
  });
  const results = response.points;
  console.log(`[DB RETRIEVE] Dense "${collectionName}" query="${query.slice(0, 60)}" → ${results.length} hits, top score: ${results[0]?.score.toFixed(3) ?? 'n/a'}`);
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
  collectionName: string,
  topK = 5
): Promise<SearchResult[]> {
  // Dense search (over-fetch for RRF candidate pool)
  const denseResults = await denseSearch(query, collectionName, topK * 3);

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
  console.log(`[DB RETRIEVE] Hybrid RRF "${collectionName}" query="${query.slice(0, 60)}" → ${fused.length} results, top score: ${fused[0]?.score.toFixed(3) ?? 'n/a'}`);
  fused.forEach((r, i) => console.log(`  [${i + 1}] score=${r.score.toFixed(3)} title="${String(r.payload.title ?? '').slice(0, 50)}"`));
  return fused;
}

/**
 * Checks if a collection has any indexed data.
 * Uses a direct fetch instead of the Qdrant client to avoid URL-construction
 * issues seen on some hosted runtimes (e.g. Vercel).
 */
export async function isIndexed(collectionName: string): Promise<boolean> {
  const base = env.QDRANT_URL.replace(/\/$/, '');
  const url = `${base}/collections/${encodeURIComponent(collectionName)}`;
  try {
    const res = await fetch(url, {
      headers: { 'api-key': env.QDRANT_API_KEY },
    });
    if (!res.ok) return false;
    const json = await res.json() as { result?: { points_count?: number; vectors_count?: number } };
    const count = json.result?.points_count ?? json.result?.vectors_count ?? 0;
    return count > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Removes all document chunks associated with a specific source file.
 */
export async function deleteBySource(source: string, collectionName: string): Promise<void> {
  console.log(`[DB DELETE] Removing all points with source="${source}" from "${collectionName}"`);

  // Ensure index exists on documents collection before deleting
  try {
    await qdrantClient.createPayloadIndex(collectionName, {
      field_name: 'source',
      field_schema: 'keyword',
      wait: true,
    });
  } catch (err) {
    // Ignore if already exists
  }

  const filter = {
    must: [
      {
        key: 'source',
        match: { value: source }
      }
    ]
  };

  try {
    // 1. Delete from documents
    await qdrantClient.delete(collectionName, {
      filter,
      wait: true,
    });

    console.log(`[DB DELETE] ✓ Removed all points with source="${source}"`);
  } catch (err: any) {
    console.error(`[DB DELETE] Failed to delete points for source "${source}":`, err?.data || err?.message || err);
    throw err;
  }
}

