import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter } from '@core/infrastructure/adapters';
import { z } from 'zod';

const starSchema = z.object({
  isStarred: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = starSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { isStarred } = result.data;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

    const chatRepo = new DrizzleChatRepositoryAdapter();
    await chatRepo.star(id, internalUserId, isStarred);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Conversation Star API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
