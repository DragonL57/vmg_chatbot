import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleChatRepositoryAdapter } from '@core/infrastructure/adapters';
import { z } from 'zod';

const renameSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(100, 'Title is too long'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate input
    const result = renameSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { title } = result.data;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

    const chatRepo = new DrizzleChatRepositoryAdapter();
    await chatRepo.rename(id, internalUserId, title);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Conversation Rename API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
