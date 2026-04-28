import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { 
  DrizzleAuthRepositoryAdapter, 
  DrizzleChatRepositoryAdapter,
  LLMProviderAdapter
} from '@core/infrastructure/adapters';
import { GenerateTitleUseCase } from '@core/application/use-cases/generate-title.use-case';
import { z } from 'zod';

const generateTitleSchema = z.object({
  conversationId: z.string().uuid(),
  firstMessage: z.string().trim().min(1, 'firstMessage cannot be empty').max(2000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const result = generateTitleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { conversationId, firstMessage } = result.data;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not synced' }, { status: 403 });

    const llmProvider = new LLMProviderAdapter();
    const chatRepo = new DrizzleChatRepositoryAdapter();
    const generateUseCase = new GenerateTitleUseCase(llmProvider, chatRepo);

    const title = await generateUseCase.execute(conversationId, internalUserId, firstMessage);

    return NextResponse.json({ title });
  } catch (error) {
    console.error('[Generate Title API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
