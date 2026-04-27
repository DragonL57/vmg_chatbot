import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { 
  DrizzleAuthRepositoryAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  QdrantVectorStoreAdapter
} from '@core/infrastructure/adapters';
import { DeleteKnowledgeFileUseCase } from '@core/application/use-cases/delete-knowledge-file.use-case';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { filename, mode } = await req.json();

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vectorStore = new QdrantVectorStoreAdapter();
    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const deleteUseCase = new DeleteKnowledgeFileUseCase(vectorStore, knowledgeRepo);

    await deleteUseCase.execute(id, filename, mode);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin File Delete API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
