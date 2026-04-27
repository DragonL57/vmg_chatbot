import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter } from '@core/infrastructure/adapters';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const authRepo = new DrizzleAuthRepositoryAdapter();
    let internalUserId = null;
    if (user) {
      internalUserId = await authRepo.getInternalId(user.id);
    }

    const chatRepo = new DrizzleChatRepositoryAdapter();
    await chatRepo.upsert({
      ...payload,
      userId: internalUserId,
      updatedAt: new Date(payload.updated_at || Date.now())
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
