import { qdrantClient, EMBEDDING_DIM, INFERENCE_MODEL } from "@core/lib/qdrant";
import { IVectorStorePort } from "../../application/ports/vector-store.port";
import { DocumentChunk } from "../../domain/entities/indexing";
import { env } from "@/env";

export class QdrantVectorStoreAdapter implements IVectorStorePort {
  async ensureCollection(collectionName: string): Promise<void> {
    try {
      const info = await qdrantClient.getCollection(collectionName);
      const existingDim = (info.config?.params?.vectors as { size?: number } | undefined)?.size;
      if (existingDim && existingDim !== EMBEDDING_DIM) {
        await qdrantClient.deleteCollection(collectionName);
        await qdrantClient.createCollection(collectionName, { vectors: { size: EMBEDDING_DIM, distance: 'Cosine' } });
      }
    } catch {
      await qdrantClient.createCollection(collectionName, { vectors: { size: EMBEDDING_DIM, distance: 'Cosine' } });
    }

    try {
      await qdrantClient.createPayloadIndex(collectionName, {
        field_name: 'source',
        field_schema: 'keyword',
        wait: true,
      });
    } catch (err) {}
  }

  async upsert(chunks: DocumentChunk[], collectionName: string): Promise<void> {
    const BATCH = 50;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const points = batch.map(chunk => ({
        id: chunk.id,
        vector: { text: `${chunk.title}\n${chunk.content}`, model: INFERENCE_MODEL } as unknown as number[],
        payload: { 
          parentId: chunk.parentId,
          title: chunk.title, 
          content: chunk.content, 
          source: chunk.source,
          parentContent: chunk.parentContent 
        },
      }));
      await qdrantClient.upsert(collectionName, { points, wait: true });
    }
  }

  async search(query: string, collectionName: string, limit = 5): Promise<DocumentChunk[]> {
    const response = await qdrantClient.query(collectionName, {
      query: { text: query, model: INFERENCE_MODEL },
      limit,
      with_payload: true,
    });
    
    return response.points.map(r => ({
      id: String(r.id),
      parentId: String(r.payload?.parentId || ''),
      score: r.score,
      title: String(r.payload?.title || ''),
      content: String(r.payload?.content || ''),
      source: String(r.payload?.source || ''),
      parentContent: String(r.payload?.parentContent || ''),
      collection: collectionName
    }));
  }

  async deleteBySource(source: string, collectionName: string): Promise<void> {
    await qdrantClient.delete(collectionName, {
      filter: {
        must: [{ key: 'source', match: { value: source } }]
      },
      wait: true,
    });
  }

  async isIndexed(collectionName: string): Promise<boolean> {
    const base = env.QDRANT_URL.replace(/\/$/, '');
    const url = `${base}/collections/${encodeURIComponent(collectionName)}`;
    try {
      const res = await fetch(url, {
        headers: { 'api-key': env.QDRANT_API_KEY },
      });
      if (!res.ok) return false;
      const json = await res.json() as any;
      const count = json.result?.points_count ?? json.result?.vectors_count ?? 0;
      return count > 0;
    } catch (err) {
      return false;
    }
  }
}
