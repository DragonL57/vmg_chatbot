export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatRequest {
  messages: Array<{ role: ChatRole; content: string }>;
  serviceMode: string;
  conversationId: string;
}
