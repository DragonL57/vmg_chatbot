import { NextResponse } from 'next/server';
import { listCollections } from '@core/services/supabase.service';
import { createServerSupabase } from '@/core/lib/supabase-server';

/**
 * Public endpoint to list available knowledge silos.
 * Accessible to all authenticated users.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return all collections (Permissions are handled at the retrieval level)
    const collections = await listCollections();
    return NextResponse.json(collections);
  } catch (error) {
    console.error('[Collections API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}
