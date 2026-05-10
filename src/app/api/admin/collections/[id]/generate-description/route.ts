import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { 
  DrizzleAuthRepositoryAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  LLMProviderAdapter
} from '@core/infrastructure/adapters';
import { GenerateCollectionDescriptionUseCase } from '@core/application/use-cases/generate-collection-description.use-case';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { collectionKey } = await req.json();

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const llmProvider = new LLMProviderAdapter();
    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const generateUseCase = new GenerateCollectionDescriptionUseCase(llmProvider, knowledgeRepo);

    const description = await generateUseCase.execute(id, collectionKey);

    return NextResponse.json({ description });
  } catch (error) {
    console.error('[Admin Collection Generate Description API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
