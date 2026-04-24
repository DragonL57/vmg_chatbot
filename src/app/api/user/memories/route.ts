import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { MemoryService } from '@core/services/memory.service';
import { db } from '@core/db';
import { userMemories } from '@core/db/schema';
import { eq, and } from 'drizzle-orm';

import { getInternalUserId } from '@core/services/auth.service';
import { z } from 'zod';

const deleteSchema = z.object({
  memoryId: z.string().uuid('ID tri thức không hợp lệ')
});

const patchSchema = z.object({
  memoryId: z.string().uuid('ID tri thức không hợp lệ'),
  fact: z.string().min(1, 'Nội dung tri thức không được để trống').max(1000, 'Nội dung tri thức quá dài')
});

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

  try {
    const body = await request.json();
    const result = deleteSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { memoryId } = result.data;

    await db.delete(userMemories).where(
      and(
        eq(userMemories.id, memoryId),
        eq(userMemories.userId, internalUserId)
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[Memories API] DELETE failed for user ${internalUserId}, memory ${memoryId}:`, err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const internalUserId = await getInternalUserId(user.id);
  if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

  let memoryId = 'unknown';
  try {
    const body = await request.json();
    const result = patchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    memoryId = result.data.memoryId;
    const { fact } = result.data;

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
    console.error(`[Memories API] PATCH failed for user ${internalUserId}, memory ${memoryId}:`, err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
