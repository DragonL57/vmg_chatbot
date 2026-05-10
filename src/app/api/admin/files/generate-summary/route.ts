import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { 
  DrizzleAuthRepositoryAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  LLMProviderAdapter
} from '@core/infrastructure/adapters';
import { GenerateFileSummaryUseCase } from '@core/application/use-cases';
import { getStoragePath } from '@/core/lib/utils';

const supabaseBackend = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

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

    const { fileId } = await req.json();

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const allFiles = await knowledgeRepo.listFiles();
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const storagePath = getStoragePath(file.metadata);
    if (!storagePath) return NextResponse.json({ error: 'File storage path not found' }, { status: 404 });

    const { data: fileData, error: downloadError } = await supabaseBackend.storage
      .from('knowledge-sources')
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 400 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const content = buffer.toString('utf-8');

    const llmProvider = new LLMProviderAdapter();
    const generateSummary = new GenerateFileSummaryUseCase(llmProvider, knowledgeRepo);
    const summary = await generateSummary.execute(fileId, content);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[Admin Generate Summary API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
