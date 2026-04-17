import { NextRequest, NextResponse } from 'next/server';
import { indexKnowledgeFile } from '@core/services/indexing.service';
import { upsertKnowledgeFile } from '@core/services/supabase.service';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

// Initialize backend Supabase client
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export const runtime = 'nodejs';
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    const { storagePath, filename, mode } = await req.json();

    if (!storagePath || !filename || !mode) {
      return NextResponse.json({ error: 'Missing storagePath, filename or collection' }, { status: 400 });
    }

    // 1. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
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
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      content = data.text;
    } else {
      content = buffer.toString('utf-8');
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: 'Downloaded content is too short' }, { status: 400 });
    }

    // 2. Create record immediately as 'indexing'
    const record = await upsertKnowledgeFile({
      filename,
      mode,
      status: 'indexing',
      progress: 0,
      logs: [`[${new Date().toLocaleTimeString('vi-VN')}] Đã tải file từ Storage...`]
    });

    // 3. RUN IN BACKGROUND
    const runIndexing = async () => {
      try {
        await indexKnowledgeFile(content, filename, mode, record.id);
        
        await upsertKnowledgeFile({
          id: record.id,
          filename,
          mode,
          status: 'completed',
          progress: 100,
          updatedAt: new Date(),
        });

        // Optional: Cleanup the source file after indexing
        await supabase.storage.from('knowledge-sources').remove([storagePath]);
        
      } catch (err: any) {
        console.error('[Background Indexing Failed]', err);
        await upsertKnowledgeFile({
          id: record.id,
          filename,
          mode,
          status: 'failed',
          errorMessage: err.message,
          updatedAt: new Date(),
        });
      }
    };

    (req as any).waitUntil?.(runIndexing());
    if (!(req as any).waitUntil) {
       runIndexing(); 
    }

    return NextResponse.json({ 
      success: true, 
      id: record.id, 
      message: 'Ingestion started from storage' 
    }, { status: 202 });

  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
