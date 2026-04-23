import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { listConversationsByUser } from '@/core/services/supabase.service';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[History API] Auth error:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!user) {
      console.warn('[History API] No user found in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[History API] Fetching conversation history');
    const history = await listConversationsByUser(user.id);
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('[History API] Unexpected error:', error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
