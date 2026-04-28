export interface DocumentChunk {
  id: string;
  parentId?: string;
  title: string;
  content: string;
  source: string;
  parentContent?: string;
  metadata?: Record<string, any>;
  score?: number;
  collection?: string;
}

export interface TokenAccumulator {
  prompt: number;
  completion: number;
  total: number;
}
