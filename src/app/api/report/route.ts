import { env } from '@/env';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { reportedMessage, conversation, note } = await req.json();

    if (!reportedMessage || !conversation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        reported_message: reportedMessage,
        conversation,
        note: note ?? null,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Report] Supabase error:', err);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Report] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
