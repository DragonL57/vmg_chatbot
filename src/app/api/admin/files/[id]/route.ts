import { NextRequest, NextResponse } from 'next/server';
import { deleteKnowledgeFile, listKnowledgeFiles } from '@core/services/supabase.service';
import { removeKnowledgeFile } from '@core/services/indexing.service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Get file info first to know filename and mode
    const files = await listKnowledgeFiles();
    const file = files.find(f => f.id === id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 2. Resolve actual Qdrant collection name
    // If mode matches a key in our static map, use that, otherwise use it directly (dynamic)
    const collectionName = file.mode === 'wiki' ? 'vmg_docs_wiki' : file.mode;

    // 3. Remove from Qdrant
    await removeKnowledgeFile(file.filename, collectionName);

    // 4. Remove from Supabase
    await deleteKnowledgeFile(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
