export const CHAT_POLICIES = {
  CONTEXT_COMPACTION_THRESHOLD: 6,
  TOKEN_COMPRESSION_THRESHOLD: 3000,
  MAX_HISTORY_MESSAGES: 10,
  MAX_ITERATIONS: 3
};

export interface TokenUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
  readonly cached_tokens?: number;
  readonly cache_creation_tokens?: number;
}

export interface ChatTrace {
  readonly id: string;
  readonly userId: string;
  readonly conversationId: string;
  readonly totalTokens: number;
  readonly totalCostUsd: string;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface ChatSpan {
  readonly id: string;
  readonly traceId: string;
  readonly nodeName: string;
  readonly model: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly cachedTokens: number;
  readonly cacheCreationTokens: number;
  readonly costUsd: string;
  readonly latencyMs: number;
}
