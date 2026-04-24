import { createServerSupabase } from '@/core/lib/supabase-server';
import { db } from '@/core/db';
import { agentTraces } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Endpoint to record user feedback on an agent trace.
 */
export async function POST(req: Request) {
  try {
    const { traceId, feedback } = await req.json(); // feedback: 1 (up) or -1 (down)

    if (!traceId || !feedback) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the trace with user feedback
    await db.update(agentTraces)
      .set({ feedback })
      .where(eq(agentTraces.id, traceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
