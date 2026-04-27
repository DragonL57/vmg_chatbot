import { NextResponse } from 'next/server';
import { DrizzleKnowledgeRepositoryAdapter } from '@core/infrastructure/adapters';

export async function GET() {
  try {
    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const collections = await knowledgeRepo.listCollections();
    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[Collections API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
