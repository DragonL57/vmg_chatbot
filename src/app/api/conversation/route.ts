import { NextResponse } from 'next/server';
import { upsertConversation } from '@core/services/supabase.service';
import { createServerSupabase } from '@/core/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, id, messages, location, tokenUsage, title } = body;
    const finalSessionId = sessionId || id;

    if (!finalSessionId || !messages) {
      return NextResponse.json({ error: 'Missing required fields', received: Object.keys(body) }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use IP-provided city/region if available
    let locationAddress: string | null = null;
    if (location?.city) {
      locationAddress = [location.city, location.region, location.country].filter(Boolean).join(', ');
    }

    const payload = {
      id: finalSessionId,
      userId: user.id, // Link to supabase user ID (upsertConversation will handle internal mapping)
      title,
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
