import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, DrizzleKnowledgeRepositoryAdapter } from '@core/infrastructure/adapters';
import { z } from 'zod';

const collectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  qdrantName: z.string().trim().min(1, 'qdrantName is required').regex(/^[a-zA-Z0-9_-]+$/, 'Invalid qdrantName format'),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const collections = await knowledgeRepo.listCollections();

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[Admin Collections GET API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = collectionSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { name, qdrantName, description } = result.data;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId || !(await authRepo.isAdmin(internalUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
    const result = await knowledgeRepo.createCollection({ name, qdrantName, description });
    
    return NextResponse.json({ success: true, collection: result });
  } catch (error) {
    console.error('[Admin Collections POST API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
