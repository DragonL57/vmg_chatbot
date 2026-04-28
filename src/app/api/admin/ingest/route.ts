import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { createServerSupabase } from '@/core/lib/supabase-server';

// Clean Architecture Imports
import { 
  LLMProviderAdapter, 
  QdrantVectorStoreAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  DrizzleAuthRepositoryAdapter
} from '@core/infrastructure/adapters';
import { IndexKnowledgeFileUseCase } from '@core/application/use-cases';

// Initialize backend Supabase client
const supabaseBackend = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export const runtime = 'nodejs';
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { storagePath, filename, mode, folder, fileId } = await req.json();

    if (!storagePath || !filename || !mode) {
      return NextResponse.json({ error: 'Missing storagePath, filename or collection' }, { status: 400 });
    }

    // 1. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseBackend.storage
      .from('knowledge-sources')
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: `Failed to download source: ${downloadError?.message}` }, { status: 400 });
    }

    let content = "";
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (filename.toLowerCase().endsWith('.pdf')) {
      const require = createRequire(import.meta.url);
      const pdf = require('pdf-extraction');
      const data = await pdf(buffer);
      content = data.text;
    } else {
      content = buffer.toString('utf-8');
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: 'Downloaded content is too short' }, { status: 400 });
    }

    // 2. Composition Root for indexing
    const llmProvider = new LLMProviderAdapter();
    const vectorStore = new QdrantVectorStoreAdapter();
    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const indexUseCase = new IndexKnowledgeFileUseCase(llmProvider, vectorStore, knowledgeRepo);

    // Ensure we have a valid fileId, reuse existing if filename matches
    let finalFileId = fileId;
    if (!finalFileId) {
      const existing = await knowledgeRepo.getFileByFilename(filename);
      finalFileId = existing ? existing.id : crypto.randomUUID();
    }

    // 3. Initialize record
    await knowledgeRepo.upsertFile({
      id: finalFileId,
      filename,
      mode,
      status: 'indexing',
      progress: 0,
      logs: [`[${new Date().toLocaleTimeString('vi-VN')}] Đã tải file từ Storage...`]
    });

    // 4. RUN IN BACKGROUND
    const runIndexing = async () => {
      try {
        await indexUseCase.execute({
          markdown: content,
          sourceFile: filename,
          collectionName: mode,
          fileId: finalFileId
        });
      } catch (err: any) {
        console.error('[Background Indexing Failed]', err);
      }
    };

    (req as any).waitUntil?.(runIndexing());
    if (!(req as any).waitUntil) {
       runIndexing(); 
    }

    return NextResponse.json({ 
      success: true, 
      id: finalFileId, 
      message: 'Ingestion started from storage' 
    }, { status: 202 });

  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
