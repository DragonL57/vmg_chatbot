import { NextResponse } from 'next/server';
import { listKnowledgeFiles } from '@core/services/supabase.service';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { isAdmin } from '@/core/services/auth.service';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleIsAdmin = await isAdmin(user.id);
    if (!roleIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const files = await listKnowledgeFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to list files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
