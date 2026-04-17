import { NextResponse } from 'next/server';
import { listKnowledgeFiles } from '@core/services/supabase.service';

export async function GET() {
  try {
    const files = await listKnowledgeFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to list files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
