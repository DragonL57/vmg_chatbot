import { NextRequest, NextResponse } from 'next/server';
import { deleteKnowledgeFile, updateKnowledgeFileRecord, listKnowledgeFiles, listCollections } from '@core/services/supabase.service';
import { deleteBySource } from '@core/services/qdrant.service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await listKnowledgeFiles();
    const file = files.find(f => f.id === id);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const collections = await listCollections();
    const col = collections.find(c => c.qdrantName === file.mode);
    if (col) {
      await deleteBySource(file.filename, col.qdrantName);
    }

    await deleteKnowledgeFile(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    await updateKnowledgeFileRecord(id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update file error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
