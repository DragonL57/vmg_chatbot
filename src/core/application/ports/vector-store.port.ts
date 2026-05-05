import { DocumentChunk } from "../../domain/entities/indexing";

export interface IVectorStorePort {
  ensureCollection(collectionName: string): Promise<void>;
  upsert(chunks: DocumentChunk[], collectionName: string): Promise<void>;
  search(query: string, collectionName: string, limit?: number): Promise<DocumentChunk[]>;
  keywordSearch(keywords: string[], collectionName: string, limit?: number): Promise<DocumentChunk[]>;
  listBySource(source: string, collectionName: string): Promise<DocumentChunk[]>;
  deleteBySource(source: string, collectionName: string): Promise<void>;
  isIndexed(collectionName: string): Promise<boolean>;
}
