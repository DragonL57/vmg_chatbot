import { qdrantClient, EMBEDDING_DIM, INFERENCE_MODEL } from "@core/lib/qdrant";
import { IVectorStorePort } from "../../application/ports/vector-store.port";
import { DocumentChunk } from "../../domain/entities/indexing";
import { env } from "@/env";

export class QdrantVectorStoreAdapter implements IVectorStorePort {
  public async ensureCollection(collectionName: string): Promise<void> {
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
      // Text indexes for keyword search
      await qdrantClient.createPayloadIndex(collectionName, {
        field_name: 'content',
        field_schema: 'text',
        wait: true,
      });
      await qdrantClient.createPayloadIndex(collectionName, {
        field_name: 'title',
        field_schema: 'text',
        wait: true,
      });
    } catch {
      // Ignored: collection might not exist
    }

  }

  public async upsert(chunks: DocumentChunk[], collectionName: string): Promise<void> {
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

  public async search(query: string, collectionName: string, limit = 5): Promise<DocumentChunk[]> {
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

  public async listBySource(source: string, collectionName: string): Promise<DocumentChunk[]> {
    const results: DocumentChunk[] = [];
    let offset: string | number | null = null;

    while (true) {
      const response = await qdrantClient.scroll(collectionName, {
        limit: 50,
        offset: offset ?? undefined,
        with_payload: true,
      });

      if (response.points.length === 0) break;

      for (const r of response.points) {
        const docSource = String(r.payload?.source || '');
        if (docSource === source) results.push(this.toDocumentChunk(r, docSource, collectionName));
      }

      if (response.next_page_offset === null || response.next_page_offset === undefined) break;
      offset = response.next_page_offset as string | number;
    }

    return results;
  }

  public async deleteBySource(source: string, collectionName: string): Promise<void> {
    const chunks = await this.listBySource(source, collectionName);
    if (chunks.length === 0) return;
    const ids = chunks.map(c => c.id);
    await qdrantClient.delete(collectionName, { points: ids, wait: true });
  }

  public async keywordSearch(keywords: string[], collectionName: string, limit = 5): Promise<DocumentChunk[]> {
    const response = await qdrantClient.scroll(collectionName, {
      filter: {
        should: keywords.map(k => ({
          key: 'content',
          match: { text: k },
        })),
      },
      limit,
      with_payload: true,
    });
    return response.points.map(r => ({
      id: String(r.id),
      parentId: String(r.payload?.parentId || ''),
      title: String(r.payload?.title || ''),
      content: String(r.payload?.content || ''),
      source: String(r.payload?.source || ''),
      parentContent: String(r.payload?.parentContent || ''),
      collection: collectionName,
    }));
  }

  private toDocumentChunk(r: { id: string | number; payload?: Record<string, unknown> | null }, source: string, collectionName: string): DocumentChunk {
    return {
      id: String(r.id),
      parentId: String(r.payload?.parentId || ''),
      title: String(r.payload?.title || ''),
      content: String(r.payload?.content || ''),
      source,
      parentContent: String(r.payload?.parentContent || ''),
      collection: collectionName,
    };
  }

  public async isIndexed(collectionName: string): Promise<boolean> {
    const base = env.QDRANT_URL.replace(/\/$/, '');
    const url = `${base}/collections/${encodeURIComponent(collectionName)}`;
    try {
      const res = await fetch(url, {
        headers: { 'api-key': env.QDRANT_API_KEY },
      });
      if (!res.ok) return false;
      const json = await res.json() as { result?: { points_count?: number, vectors_count?: number } };
      const count = json.result?.points_count ?? json.result?.vectors_count ?? 0;
      return count > 0;
    } catch {
      return false;
    }
  }
}
