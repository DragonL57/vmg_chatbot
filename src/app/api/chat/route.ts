import { createServerSupabase } from '@/core/lib/supabase-server';
import { chatRequestSchema } from '@core/application/schemas/chat-request-schema';
import { DocumentPassage } from '@core/domain/entities/indexing';
import { ILoggerProvider } from '@core/application/ports/logger.port';
import {
  DrizzleMemoryRepository,
  LLMProviderAdapter,
  DrizzleObservabilityAdapter,
  DrizzleAuthRepositoryAdapter,
  DrizzleChatRepositoryAdapter,
  ConsoleLoggerAdapter,
} from '@core/infrastructure/adapters';
import {
  ExtractUserMemoriesUseCase,
  GetRecentMemoriesUseCase,
  GetInternalUserIdUseCase,
} from '@core/application/use-cases';
import {
  runReasoningGraph,
  runGenerationPhase,
  emitTotalTokens,
} from './chat-helpers';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface RetrievalEvidence { docs: DocumentPassage[]; }

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const logger = new ConsoleLoggerAdapter();
  try {
    const json = await req.json();
    const result = chatRequestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Invalid request payload', details: result.error.format() }), { status: 400 });
    }
    const { messages, conversationId } = result.data;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await new GetInternalUserIdUseCase(authRepo).execute(user.id);
    if (!internalUserId) return new Response(JSON.stringify({ error: 'User not synced' }), { status: 403 });
    return new Response(createChatStream({ messages, conversationId, internalUserId, logger }), {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  } catch (error: unknown) {
    logger.error('[Chat API] Fatal Error', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// ─── Stream ─────────────────────────────────────────────────────────────────

function createChatStream(params: {
  messages: { role: string; content: string }[];
  conversationId: string;
  internalUserId: string;
  logger: ILoggerProvider;
}) {
  const { messages, conversationId, internalUserId, logger } = params;
  const memoryRepo = new DrizzleMemoryRepository();
  const llmProvider = new LLMProviderAdapter();
  const obsPort = new DrizzleObservabilityAdapter();
  const getRecentMemories = new GetRecentMemoriesUseCase(memoryRepo);
  const extractUserMemories = new ExtractUserMemoriesUseCase(llmProvider, memoryRepo, obsPort, logger);

  return new ReadableStream({
    async start(controller) {
      const emit = (obj: { type: string; value?: unknown; reflection?: string; count?: number }) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));

      try {
        const memories = await getRecentMemories.execute(internalUserId, 20);
        await new DrizzleChatRepositoryAdapter().ensureExists(conversationId, internalUserId)
          .catch((err) => logger.error('Ensure conversation exists fail', err));

        const traceId = await obsPort.startTrace(internalUserId, conversationId)
          .catch((err) => { logger.error('Start trace fail', err); return null; });
        if (traceId) emit({ type: 'trace_id', value: traceId });

        const { finalState, earlyExit } = await runReasoningGraph(
          { messages, memories, traceId },
          { llmProvider, obsPort, logger },
          emit,
        );

        if (earlyExit) { emitTotalTokens(finalState, null, emit); controller.close(); return; }

        await runGenerationPhase(
          { finalState, messages, memories, traceId, internalUserId },
          { llmProvider, obsPort, extractUserMemories, logger },
          emit,
        );

        controller.close();
      } catch (error: unknown) {
        logger.error('[Chat API] Stream Error', error);
        controller.close();
      }
    },
  });
}
