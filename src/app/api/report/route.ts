import { db } from '@/core/db';
import { reports, users } from '@/core/db/schema';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Map supabase ID to internal user ID
    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.supabaseId, user.id));

    const { reportedMessage, conversation, note, sessionId } = await req.json();

    if (!reportedMessage || !conversation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.insert(reports).values({
      userId: dbUser?.id,
      reportedMessage,
      conversation,
      note: note ?? null,
      sessionId: sessionId ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Report] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
