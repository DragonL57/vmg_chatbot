export interface KnowledgeFile {
  id: string;
  filename: string;
  mode: string;
  status: 'pending' | 'indexing' | 'completed' | 'failed';
  progress: number;
  summary?: string;
  logs: string[];
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  qdrantName: string;
  description?: string;
}

export interface IKnowledgeRepositoryPort {
  listFiles(): Promise<KnowledgeFile[]>;
  getFileByFilename(filename: string): Promise<KnowledgeFile | null>;
  upsertFile(file: Partial<KnowledgeFile> & { id: string }): Promise<void>;
  deleteFile(id: string): Promise<void>;
  listCollections(): Promise<KnowledgeCollection[]>;
  createCollection(data: Omit<KnowledgeCollection, 'id'>): Promise<KnowledgeCollection>;
  updateCollection(id: string, data: Partial<KnowledgeCollection>): Promise<void>;
  deleteCollection(id: string): Promise<void>;
}
