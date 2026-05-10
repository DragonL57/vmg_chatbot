export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatRequest {
  readonly messages: ReadonlyArray<{ readonly role: ChatRole; readonly content: string }>;
  readonly conversationId: string;
}
