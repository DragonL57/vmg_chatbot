import { NextRequest, NextResponse } from 'next/server';
import { deleteCollectionRecord, listCollections } from '@core/services/supabase.service';
import { qdrantClient } from '@core/lib/qdrant';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Get info to know the qdrant collection name
    const collections = await listCollections();
    const col = collections.find(c => c.id === id);

    if (!col) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // 2. Delete from Qdrant
    try {
      await qdrantClient.deleteCollection(col.qdrantName);
    } catch (qErr: any) {
      console.warn('Qdrant collection delete error:', qErr.message);
    }

    // 3. Remove from Supabase
    await deleteCollectionRecord(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete collection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
