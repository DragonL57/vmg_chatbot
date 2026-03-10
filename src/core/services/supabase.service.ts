import { env } from '@/env';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConversationPayload {
  id: string;
  messages: any[];
  location_coords?: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
  location_address?: string;
  token_usage?: TokenUsage;
  message_count: number;
  updated_at: string;
}

export async function upsertConversation(payload: ConversationPayload) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }

  return res;
}
