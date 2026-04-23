import { NextResponse } from 'next/server';
import { ManagerService } from '@/core/services/manager.service';
import { createServerSupabase } from '@/core/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firstMessage } = await req.json();
    if (!firstMessage) {
      return NextResponse.json({ error: 'Missing firstMessage' }, { status: 400 });
    }

    const title = await ManagerService.generateTitle(firstMessage);
    return NextResponse.json({ title });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
