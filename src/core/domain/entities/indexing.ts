export interface DocumentChunk {
  readonly id: string;
  readonly parentId?: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly parentContent?: string;
  readonly metadata?: Record<string, unknown>;
  readonly score?: number;
  readonly collection?: string;
}

export interface TokenAccumulator {
  prompt: number;
  completion: number;
  total: number;
}
