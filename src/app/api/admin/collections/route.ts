import { NextRequest, NextResponse } from 'next/server';
import { listCollections, createCollectionRecord } from '@core/services/supabase.service';
import { qdrantClient, EMBEDDING_DIM } from '@core/lib/qdrant';

export async function GET() {
  try {
    const collections = await listCollections();
    return NextResponse.json(collections);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, qdrant_name, description } = await req.json();

    if (!name || !qdrant_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create collection in Qdrant
    try {
      await qdrantClient.createCollection(qdrant_name, {
        vectors: { size: EMBEDDING_DIM, distance: 'Cosine' }
      });
      
      // Also ensure the 'source' index for deletions
      await qdrantClient.createPayloadIndex(qdrant_name, {
        field_name: 'source',
        field_schema: 'keyword',
        wait: true
      });
    } catch (qErr: any) {
      // If already exists, we might want to continue or error
      console.warn('Qdrant collection error:', qErr.message);
    }

    // 2. Save record in Supabase
    const record = await createCollectionRecord({ name, qdrant_name, description });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('Collection creation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
