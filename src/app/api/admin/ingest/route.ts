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
  DrizzleAuthRepositoryAdapter
} from '@core/infrastructure/adapters';
import { IndexKnowledgeFileUseCase } from '@core/application/use-cases';

// Initialize backend Supabase client
const supabaseBackend = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export const runtime = 'nodejs';
export const maxDuration = 300; 

interface IngestRequest {
  storagePath: string;
  filename: string;
  mode: string;
  folder?: string;
  fileId?: string;
}

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
  try {
    const user = await validateAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized or Forbidden' }, { status: 403 });
    }

    const { storagePath, filename, mode, folder, fileId }: IngestRequest = await req.json();

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
        const message = err instanceof Error ? err.message : String(err);
        console.error('[Background Indexing Failed]', message);
      }
    };

    waitUntil(runIndexing());

    return NextResponse.json({ 
      success: true, 
      id: finalFileId, 
      message: 'Ingestion started from storage' 
    }, { status: 202 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
