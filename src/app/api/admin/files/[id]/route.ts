import { NextRequest, NextResponse } from 'next/server';
import { deleteKnowledgeFile, updateKnowledgeFileRecord, listKnowledgeFiles, listCollections } from '@core/services/supabase.service';
import { deleteBySource } from '@core/services/qdrant.service';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { isAdmin } from '@/core/services/auth.service';

export async function DELETE(
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
    const body = await req.json();
    await updateKnowledgeFileRecord(id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update file error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
