export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
    cache_creation_tokens?: number;
  };
  model: string;
  isBatch?: boolean;
}

export interface ILLMProvider {
  completion(params: {
    messages: LLMMessage[];
    model?: string;
    jsonMode?: boolean;
    effort?: 'instant' | 'low' | 'medium' | 'high';
  }): Promise<LLMResponse>;
}
