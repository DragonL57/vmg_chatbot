import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter } from '@core/infrastructure/adapters';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

    const chatRepo = new DrizzleChatRepositoryAdapter();
    const conversation = await chatRepo.getById(id, internalUserId);

    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('[Conversation GET API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
