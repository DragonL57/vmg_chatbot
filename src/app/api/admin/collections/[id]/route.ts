import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleKnowledgeRepositoryAdapter } from '@core/infrastructure/adapters';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    await knowledgeRepo.updateCollection(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Collection PATCH API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    
    // Find the collection to get its collectionKey for cascading file deletion
    const collections = await knowledgeRepo.listCollections();
    const col = collections.find(c => c.id === id);
    
    // Delete all files in this silo first
    if (col) {
      const allFiles = await knowledgeRepo.listFiles();
      const siloFiles = allFiles.filter(f => f.collectionKey === col.collectionKey);
      for (const f of siloFiles) {
        await knowledgeRepo.deleteFile(f.id);
      }
    }
    
    await knowledgeRepo.deleteCollection(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Collection DELETE API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
