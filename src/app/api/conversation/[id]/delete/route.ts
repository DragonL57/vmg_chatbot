import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter, ConsoleLoggerAdapter } from '@core/infrastructure/adapters';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let conversationId: string | undefined;
  try {
    const { id } = await params;
    conversationId = id;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

    const chatRepo = new DrizzleChatRepositoryAdapter();
    await chatRepo.delete(id, internalUserId);

    const logger = new ConsoleLoggerAdapter();
    logger.info('Conversation deleted', { conversationId, userId: internalUserId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const logger = new ConsoleLoggerAdapter();
    logger.error('Conversation delete failed', error, { conversationId });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
