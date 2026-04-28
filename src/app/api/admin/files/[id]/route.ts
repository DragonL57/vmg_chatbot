import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { 
  DrizzleAuthRepositoryAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  QdrantVectorStoreAdapter
} from '@core/infrastructure/adapters';
import { DeleteKnowledgeFileUseCase } from '@core/application/use-cases/delete-knowledge-file.use-case';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['pending', 'indexing', 'completed', 'failed']).optional(),
  progress: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
  logs: z.array(z.string()).optional(),
});

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
    const allFiles = await knowledgeRepo.listFiles();
    const file = allFiles.find(f => f.id === id);
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const vectorStore = new QdrantVectorStoreAdapter();
    const deleteUseCase = new DeleteKnowledgeFileUseCase(vectorStore, knowledgeRepo);

    await deleteUseCase.execute(id, file.filename, file.mode);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin File Delete API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
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

    const body = await req.json();
    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    await knowledgeRepo.upsertFile({
      id,
      ...result.data
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin File Patch API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
