export type ServiceMode = 'esl' | 'study-abroad';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: ServiceMode;
  isAmbiguous?: boolean;
  isToolCall?: boolean;
  leadData?: {
    name?: string | null;
    phone?: string | null;
    childName?: string | null;
    childDob?: string | null;
    notes?: string | null;
  } | null;
}

