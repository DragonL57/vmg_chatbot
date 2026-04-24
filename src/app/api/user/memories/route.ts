import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { MemoryService } from '@core/services/memory.service';
import { db } from '@core/db';
import { userMemories } from '@core/db/schema';
import { eq, and } from 'drizzle-orm';

import { getInternalUserId } from '@core/services/auth.service';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const internalUserId = await getInternalUserId(user.id);
  if (!internalUserId) return NextResponse.json({ memories: [] });

  const memories = await MemoryService.getUserMemories(internalUserId);
  return NextResponse.json({ memories });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const internalUserId = await getInternalUserId(user.id);
  if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

  const { memoryId } = await request.json();
  if (!memoryId) return NextResponse.json({ error: 'Missing memoryId' }, { status: 400 });

  try {
    await db.delete(userMemories).where(
      and(
        eq(userMemories.id, memoryId),
        eq(userMemories.userId, internalUserId)
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const internalUserId = await getInternalUserId(user.id);
  if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

  const { memoryId, fact } = await request.json();
  if (!memoryId || !fact) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  try {
    await db.update(userMemories)
      .set({ fact })
      .where(
        and(
          eq(userMemories.id, memoryId),
          eq(userMemories.userId, internalUserId)
        )
      );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
