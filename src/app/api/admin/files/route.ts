import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleKnowledgeRepositoryAdapter } from '@core/infrastructure/adapters';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const isAdmin = await authRepo.isAdmin(internalUserId);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const files = await knowledgeRepo.listFiles();

    return NextResponse.json({ files });
  } catch (error) {
    console.error('[Admin Files API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
