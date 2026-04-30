import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter } from '@core/infrastructure/adapters';
import { z } from 'zod';

const upsertSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  messages: z.array(z.object({
    id: z.string().optional(), // Make it optional in schema but we will provide fallback
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string().or(z.date()).optional(),
    reasoningTrace: z.array(z.string()).optional(),
    traceId: z.string().optional(),
  })),
  locationCoords: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  locationAddress: z.string().optional(),
  tokenUsage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
    cached_tokens: z.number().optional(),
    cache_creation_tokens: z.number().optional(),
  }).optional(),
  messageCount: z.number().optional(),
  updated_at: z.string().or(z.number()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const result = upsertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const payload = result.data;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) {
      return NextResponse.json({ error: 'User not synced' }, { status: 403 });
    }

    const chatRepo = new DrizzleChatRepositoryAdapter();
    await chatRepo.upsert({
      ...payload,
      userId: internalUserId,
      messages: payload.messages.map((m) => ({
        ...m,
        id: m.id || crypto.randomUUID(),
        timestamp: new Date(m.timestamp || Date.now())
      })),
      updatedAt: new Date(payload.updated_at || Date.now())
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
