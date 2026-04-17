import { NextRequest, NextResponse } from 'next/server';
import { indexKnowledgeFile } from '@core/services/indexing.service';
import { upsertKnowledgeFile } from '@core/services/supabase.service';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export const runtime = 'nodejs';
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string;

    if (!file || !mode) {
      return NextResponse.json({ error: 'Missing file or collection' }, { status: 400 });
    }

    let content = "";
    const filename = file.name;

    if (filename.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Using stable pdf-parse 1.1.1
      const data = await pdf(buffer);
      content = data.text;
    } else {
      content = await file.text();
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: 'File content is too short' }, { status: 400 });
    }

    // 1. Create record immediately as 'indexing'
    const record = await upsertKnowledgeFile({
      filename,
      mode,
      status: 'indexing',
      progress: 0,
      logs: [`[${new Date().toLocaleTimeString('vi-VN')}] Đã tiếp nhận yêu cầu...`]
    });

    // 2. RUN IN BACKGROUND
    const runIndexing = async () => {
      try {
        await indexKnowledgeFile(content, filename, mode, record.id);
        
        await upsertKnowledgeFile({
          id: record.id,
          filename,
          mode,
          status: 'completed',
          progress: 100,
          updated_at: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('[Background Indexing Failed]', err);
        await upsertKnowledgeFile({
          id: record.id,
          filename,
          mode,
          status: 'failed',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        });
      }
    };

    // Trigger background task (Next.js 15+ waitUntil pattern)
    (req as any).waitUntil?.(runIndexing());
    if (!(req as any).waitUntil) {
       runIndexing(); 
    }

    return NextResponse.json({ 
      success: true, 
      id: record.id, 
      message: 'Ingestion started in background' 
    }, { status: 202 });

  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
