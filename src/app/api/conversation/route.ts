import { env } from '@/env';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { sessionId, messages, location, tokenUsage } = await req.json();

    if (!sessionId || !messages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Attempt reverse geocode but always keep raw coords
    let locationAddress: string | null = null;
    if (location?.latitude && location?.longitude) {
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude}&lon=${location.longitude}&format=json`,
          { headers: { 'User-Agent': 'VMGWiki/1.0' } }
        );
        if (geo.ok) {
          const data = await geo.json();
          locationAddress = data.display_name ?? null;
        }
      } catch {
        // Non-fatal — raw coords still saved
      }
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

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Conversation] Supabase error:', err);
      return NextResponse.json({ error: 'Failed to save conversation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Conversation] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
