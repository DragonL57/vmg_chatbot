import { NextRequest, NextResponse } from 'next/server';
import { listKnowledgeFiles, updateKnowledgeFileRecord } from '@core/services/supabase.service';
import { fetchFullFileContent, generateFileSummary, refreshCollectionDescription } from '@core/services/indexing.service';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { isAdmin } from '@/core/services/auth.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    // 1. Get file metadata
    const files = await listKnowledgeFiles();
    const file = files.find(f => f.id === id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log(`[Manual Summary] Starting for: ${file.filename}`);

    if (!file.mode) {
      return NextResponse.json({ error: 'File mode is missing' }, { status: 400 });
    }

    // 2. Fetch full content from Qdrant (Smart Skeleton base)
    const content = await fetchFullFileContent(file.filename, file.mode);
    if (!content) {
      return NextResponse.json({ error: 'Could not retrieve file content from vector store' }, { status: 400 });
    }

    // 3. Generate summary
    const tokens = { prompt: 0, completion: 0, total: 0 };
    const summary = await generateFileSummary(content, tokens);

    // 4. Update database
    await updateKnowledgeFileRecord(id, { summary });

    // 5. Trigger collection refresh (optional but recommended)
    await refreshCollectionDescription(file.mode, tokens);

    return NextResponse.json({ 
      success: true, 
      summary,
      tokens 
    });
  } catch (error: any) {
    console.error('Manual summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
