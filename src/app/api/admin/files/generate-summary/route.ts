import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { 
  DrizzleAuthRepositoryAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  QdrantVectorStoreAdapter,
  LLMProviderAdapter
} from '@core/infrastructure/adapters';
import { 
  GetFullFileContentUseCase, 
  GenerateFileSummaryUseCase 
} from '@core/application/use-cases';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fileId, filename, mode } = await req.json();
    
    const vectorStore = new QdrantVectorStoreAdapter();
    const llmProvider = new LLMProviderAdapter();
    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();

    const getFullContent = new GetFullFileContentUseCase(vectorStore);
    const generateSummary = new GenerateFileSummaryUseCase(llmProvider, knowledgeRepo);

    const fullContent = await getFullContent.execute(filename, mode);
    if (!fullContent) return NextResponse.json({ error: 'File content not found' }, { status: 404 });

    const summary = await generateSummary.execute(fileId, fullContent);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[Admin Generate Summary API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
