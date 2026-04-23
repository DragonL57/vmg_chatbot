import { NextRequest, NextResponse } from 'next/server';
import { deleteCollectionRecord, listCollections, updateCollectionRecord } from '@core/services/supabase.service';
import { qdrantClient } from '@core/lib/qdrant';
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
    const collections = await listCollections();
    const col = collections.find(c => c.id === id);
    if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

    try {
      await qdrantClient.deleteCollection(col.qdrantName);
    } catch (qErr: any) {
      console.warn('Qdrant collection delete error:', qErr.message);
    }

    await deleteCollectionRecord(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete collection error:', error);
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
    await updateCollectionRecord(id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update collection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
