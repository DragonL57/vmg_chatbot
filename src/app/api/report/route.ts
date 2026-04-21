import { db } from '@/core/db';
import { reports } from '@/core/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { reportedMessage, conversation, note, sessionId } = await req.json();

    if (!reportedMessage || !conversation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.insert(reports).values({
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
