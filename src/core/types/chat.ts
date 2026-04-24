export interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp: Date;
  readonly isToolCall?: boolean;
  readonly leadData?: any;
  readonly mode?: string;
  readonly isAmbiguous?: boolean;
  readonly citations?: Record<string, string>;
  readonly reasoningTrace?: ReadonlyArray<string>;
  readonly memoryUpdated?: boolean;
  readonly traceId?: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
