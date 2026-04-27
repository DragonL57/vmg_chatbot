import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter } from '@core/infrastructure/adapters';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);

    if (!internalUserId) {
      return NextResponse.json([]);
    }

    const chatRepo = new DrizzleChatRepositoryAdapter();
    const conversations = await chatRepo.listByUser(internalUserId);

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('[History API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
