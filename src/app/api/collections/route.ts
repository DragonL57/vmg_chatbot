import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleKnowledgeRepositoryAdapter } from '@core/infrastructure/adapters';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const collections = await knowledgeRepo.listCollections();
    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[Collections API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
