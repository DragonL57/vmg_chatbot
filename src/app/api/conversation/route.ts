import { NextResponse } from 'next/server';
import { upsertConversation } from '@core/services/supabase.service';

export async function POST(req: Request) {
  try {
    const { sessionId, messages, location, tokenUsage } = await req.json();

    if (!sessionId || !messages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use IP-provided city/region if available
    let locationAddress: string | null = null;
    if (location?.city) {
      locationAddress = [location.city, location.region, location.country].filter(Boolean).join(', ');
    }

    const payload = {
      id: sessionId,
      messages,
      message_count: messages.filter((m: { role: string }) => m.role !== 'system').length,
      updated_at: new Date().toISOString(),
      ...(location ? {
        location_coords: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy ?? null,
        },
      } : {}),
      ...(locationAddress ? { location_address: locationAddress } : {}),
      ...(tokenUsage ? { token_usage: tokenUsage } : {}),
    };

    await upsertConversation(payload);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Conversation] Error saving to DB:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
