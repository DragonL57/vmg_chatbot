import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { waitUntil } from '@vercel/functions';

// Clean Architecture Imports
import { 
  LLMProviderAdapter, 
  QdrantVectorStoreAdapter, 
  DrizzleKnowledgeRepositoryAdapter,
  DrizzleAuthRepositoryAdapter,
  ConsoleLoggerAdapter
} from '@core/infrastructure/adapters';
import { IndexKnowledgeFileUseCase } from '@core/application/use-cases';
import { ingestRequestSchema } from '@core/domain/entities/ingest-request';

// Initialize backend Supabase client
const supabaseBackend = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export const runtime = 'nodejs';
export const maxDuration = 300; 

async function validateAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const authRepo = new DrizzleAuthRepositoryAdapter();
  const internalUserId = await authRepo.getInternalId(user.id);
  if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
    return null;
  }
  return user;
}

async function extractContent(buffer: Buffer, filename: string): Promise<string> {
  if (filename.toLowerCase().endsWith('.pdf')) {
    const require = createRequire(import.meta.url);
    const pdf = require('pdf-extraction');
    const data = await pdf(buffer);
    return data.text;
  }
  return buffer.toString('utf-8');
}

export async function POST(req: NextRequest) {
  const logger = new ConsoleLoggerAdapter();
  try {
    const user = await validateAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized or Forbidden' }, { status: 403 });
    }

    const json = await req.json();
    const result = ingestRequestSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid request payload', 
        details: result.error.format() 
      }, { status: 400 });
    }

    const { storagePath, filename, mode, folder, fileId } = result.data;

    // 1. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseBackend.storage
      .from('knowledge-sources')
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: `Failed to download source: ${downloadError?.message}` }, { status: 400 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const content = await extractContent(Buffer.from(arrayBuffer), filename);

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
      folder: folder || 'root',
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
          fileId: finalFileId!
        });
      } catch (err: unknown) {
        logger.error('Background Indexing Failed', err);
      }
    };

    waitUntil(runIndexing());

    return NextResponse.json({ 
      success: true, 
      id: finalFileId, 
      message: 'Ingestion started from storage' 
    }, { status: 202 });

  } catch (error: unknown) {
    logger.error('Ingest error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
