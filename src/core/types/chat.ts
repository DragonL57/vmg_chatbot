export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isToolCall?: boolean;
  leadData?: any;
  mode?: string;
  isAmbiguous?: boolean;
  citations?: Record<string, string>;
  reasoningTrace?: string[];
  memoryUpdated?: boolean;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
