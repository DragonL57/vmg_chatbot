export const CHAT_POLICIES = {
  CONTEXT_COMPACTION_THRESHOLD: 6,
  TOKEN_COMPRESSION_THRESHOLD: 3000,
  MAX_HISTORY_MESSAGES: 10,
  MAX_ITERATIONS: 3
};

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
  cache_creation_tokens?: number;
}

export interface ChatTrace {
  id: string;
  userId: string;
  conversationId: string;
  totalTokens: number;
  totalCostUsd: string;
  latencyMs: number;
  error?: string;
}

export interface ChatSpan {
  id: string;
  traceId: string;
  nodeName: string;
  model: string;
  input?: unknown;
  output?: unknown;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
  costUsd: string;
  latencyMs: number;
}
