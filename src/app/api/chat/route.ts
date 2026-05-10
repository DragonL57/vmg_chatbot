import { getGenerationProvider } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { waitUntil } from '@vercel/functions';
import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Clean Architecture Imports
import { 
  DrizzleMemoryRepository, 
  LLMProviderAdapter, 
  DrizzleObservabilityAdapter,
  DrizzleAuthRepositoryAdapter,
  DrizzleChatRepositoryAdapter,
  ConsoleLoggerAdapter
} from '@core/infrastructure/adapters';
import { 
  ExtractUserMemoriesUseCase, 
  GetRecentMemoriesUseCase,
  GetInternalUserIdUseCase
} from '@core/application/use-cases';
import { DocumentPassage } from '@core/domain/entities/indexing';
import { TokenUsage } from '@core/domain/entities/chat';
import { chatRequestSchema } from '@core/application/schemas/chat-request-schema';
import { AgentStateType } from '@core/agent/state';
import { ILoggerProvider } from '@core/application/ports/logger.port';
import { IObservabilityPort } from '@core/application/ports/observability.port';
import { ILLMProvider } from '@core/application/ports/llm-provider.port';
import { UserMemory } from '@core/domain/entities/memory';

export interface RetrievalEvidence {
  docs: DocumentPassage[];
}

export const runtime = 'nodejs';
export const maxDuration = 60; 

/**
 * Unified Chat Route Handler
 */
export async function POST(req: Request) {
  const logger = new ConsoleLoggerAdapter();
  try {
    const json = await req.json();
    const result = chatRequestSchema.safeParse(json);
    
    if (!result.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request payload', 
        details: result.error.format() 
      }), { status: 400 });
    }

    const { messages, conversationId } = result.data;

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await new GetInternalUserIdUseCase(authRepo).execute(user.id);
    if (!internalUserId) return new Response(JSON.stringify({ error: 'User not synced' }), { status: 403 });

    return new Response(createChatStream({
      messages, conversationId, internalUserId, logger
    }), { headers: { 'Content-Type': 'application/x-ndjson' } });
  } catch (error: unknown) {
    logger.error('[Chat API] Fatal Error', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

interface StreamParams {
  messages: { role: string; content: string }[];
  conversationId: string;
  internalUserId: string;
  logger: ILoggerProvider;
}

function createChatStream(params: StreamParams) {
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

        const traceId = await obsPort.startTrace(internalUserId, conversationId).catch((err) => {
          logger.error('Start trace fail', err);
          return null;
        });
        if (traceId) emit({ type: 'trace_id', value: traceId });

        const { finalState, earlyExit } = await runReasoningGraph(
          { messages, memories, traceId },
          { llmProvider, obsPort, logger },
          emit
        );

        if (earlyExit) {
          emitTotalTokens(finalState, null, emit);
          controller.close();
          return;
        }

        await runGenerationPhase(
          { finalState, messages, memories, traceId, internalUserId },
          { llmProvider, obsPort, extractUserMemories, logger },
          emit
        );

        controller.close();
      } catch (error: unknown) {
        logger.error('[Chat API] Stream Error', error);
        controller.close();
      }
    },
  });
}

async function runReasoningGraph(params: { messages: { role: string; content: string }[], memories: UserMemory[], traceId: string | null }, config: { llmProvider: ILLMProvider, obsPort: IObservabilityPort, logger: ILoggerProvider }, emit: (obj: { type: string; value?: unknown; reflection?: string }) => void) {
  const { messages, memories, traceId } = params;
  const langchainMessages = messages.slice(-10).map((m) => 
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  let finalState: AgentStateType = {} as AgentStateType;
  const graphStream = await ragGraph.stream({
    messages: langchainMessages,
    userMemories: memories.map((m) => m.fact),
    traceId,
  }, { configurable: config });

  for await (const step of graphStream) {
    const nodeName = Object.keys(step)[0];
    const state = (step as Record<string, AgentStateType>)[nodeName];
    finalState = { ...finalState, ...state };
    if (state.reflection) emit({ type: 'phase', value: nodeName, reflection: state.reflection });
    
    if (nodeName === 'analyze_query' && state.questionIsClear === false) {
      emit({ type: 'content', value: state.reflection || "Yêu cầu chưa rõ ràng." });
      if (traceId) {
        waitUntil(config.obsPort.finalizeTrace(traceId, 'clarification_requested').catch((err) => {
          config.logger.error('Finalize clarification trace fail', err);
        }));
      }
      return { finalState, earlyExit: true };
    }
  }
  return { finalState, earlyExit: false };
}

async function runGenerationPhase(params: { finalState: AgentStateType, messages: { role: string; content: string }[], memories: UserMemory[], traceId: string | null, internalUserId: string }, config: { llmProvider: ILLMProvider, obsPort: IObservabilityPort, extractUserMemories: ExtractUserMemoriesUseCase, logger: ILoggerProvider }, emit: (obj: { type: string; value?: unknown; count?: number }) => void) {
  const startTime = Date.now();
  const { finalState, messages, memories, traceId, internalUserId } = params;
  const { obsPort, extractUserMemories, logger } = config;
  
  emit({ type: 'phase', value: 'generate' });
  const { client, model, extraBody } = getGenerationProvider();
  const systemPrompt = buildSystemPrompt(finalState, memories.map((m) => `- ${m.fact}`).join('\n'), messages[messages.length - 1].content);

  const response = await client.chat.completions.create({
    model, stream: true, stream_options: { include_usage: true },
    messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-10)] as ChatCompletionMessageParam[],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  let fullContent = '';
  let finalUsage: TokenUsage | null = null;
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) { fullContent += content; emit({ type: 'content', value: content }); }
    if (chunk.usage) {
      finalUsage = {
        prompt_tokens: chunk.usage.prompt_tokens,
        completion_tokens: chunk.usage.completion_tokens,
        total_tokens: chunk.usage.total_tokens,
        cached_tokens: (chunk.usage as { prompt_tokens_details?: { cached_tokens?: number } }).prompt_tokens_details?.cached_tokens,
        cache_creation_tokens: (chunk.usage as { prompt_tokens_details?: { cache_creation_input_tokens?: number } }).prompt_tokens_details?.cache_creation_input_tokens,
      };
    }
  }

  finalizeObservability(obsPort, traceId, fullContent, finalUsage, systemPrompt.length, logger, Date.now() - startTime, finalState.reflection);
  emitTotalTokens(finalState, finalUsage, emit);

  if (internalUserId) {
    const count = await extractUserMemories.execute({ userId: internalUserId, messages, traceId });
    if (count > 0) emit({ type: 'memory_update', count });
  }
}

function buildSystemPrompt(state: AgentStateType, userMemories: string, lastUserMessage: string): string {
  const evidence = state.evidence;
  const contextSummary = state.context_summary;
  const isChitChat = !!state.isChitChat;
  let knowledgeBlock = '';
  if (evidence?.docs?.length > 0) {
    knowledgeBlock = buildRetrievedContext(evidence);
    if (contextSummary) knowledgeBlock += `\n\n# CẤU TRÚC SỰ THẬT (FACT SHEET)\n${contextSummary}`;
  }
  return `
${MASTER_AGENT_IDENTITY}
${userMemories ? `\n# THÔNG TIN BỐI CẢNH VỀ NGƯỜI DÙNG\n<user_memories>\n${userMemories}\n</user_memories>\n` : ''}
${isChitChat ? 'Tán gẫu.' : AGENT_ORCHESTRATOR_PROMPT()}
${MASTER_OUTPUT_CONSTRAINTS}
# KNOWLEDGE CONTEXT
${knowledgeBlock || "No specific enterprise knowledge found."}
## CURRENT GOAL: ${lastUserMessage}
  `.trim();
}

function finalizeObservability(obsPort: IObservabilityPort, traceId: string | null, content: string, usage: TokenUsage | null, promptLen: number, logger: ILoggerProvider, latencyMs: number, searchPath?: string) {
  if (!traceId) return;
  const { model } = getGenerationProvider();
  waitUntil((async () => {
    if (usage) {
      await obsPort.emitSpan(traceId, {
        nodeName: 'final_generation', 
        model, 
        input: { promptChars: promptLen }, 
        output: content,
        promptTokens: usage.prompt_tokens || 0, 
        completionTokens: usage.completion_tokens || 0,
        cachedTokens: usage.cached_tokens || 0, 
        cacheCreationTokens: usage.cache_creation_tokens || 0, 
        latencyMs
      }).catch(err => logger.error('Final span fail', err));
    }
    await obsPort.finalizeTrace(traceId, undefined, searchPath).catch(err => logger.error('Finalize fail', err));
  })());
}

function emitTotalTokens(finalState: AgentStateType, usage: TokenUsage | null, emit: (obj: { type: string; value: unknown }) => void) {
  const g = finalState.totalUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const f = usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  const value: Record<string, number> = {
    prompt_tokens: (g.prompt_tokens || 0) + (f.prompt_tokens || 0),
    completion_tokens: (g.completion_tokens || 0) + (f.completion_tokens || 0),
    total_tokens: (g.total_tokens || 0) + (f.total_tokens || 0),
  };

  emit({ type: 'tokens', value });
}

function buildRetrievedContext(evidence: { docs: DocumentPassage[] }): string {
  return `<retrieved_context>\n${evidence.docs.map((doc, i) => `  <document index="${i}">\n    <title>${doc.title}</title>\n    <source>${doc.source}</source>\n    <path>${doc.parentContent || ''}</path>\n    <content>${doc.content}</content>\n  </document>`).join('\n')}\n</retrieved_context>`;
}
