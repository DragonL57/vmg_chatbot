export interface SpanData {
  nodeName: string;
  model: string;
  input?: unknown;
  output?: unknown;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
  latencyMs: number;
  isBatch?: boolean;
}

export interface IObservabilityPort {
  startTrace(userId: string, conversationId: string): Promise<string>;
  emitSpan(traceId: string, data: SpanData): Promise<void>;
  finalizeTrace(traceId: string, error?: string): Promise<void>;
}
