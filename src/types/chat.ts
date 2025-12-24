export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isAmbiguous?: boolean;
  leadData?: {
    name?: string | null;
    phone?: string | null;
    childName?: string | null;
    childDob?: string | null;
    notes?: string | null;
  } | null;
}

