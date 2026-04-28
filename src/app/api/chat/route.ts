import { getGenerationProvider, ProviderResult } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { estimateTokens } from '@core/lib/utils';
import { waitUntil } from '@vercel/functions';

// Clean Architecture Imports
import { 
  DrizzleMemoryRepository, 
  LLMProviderAdapter, 
  DrizzleObservabilityAdapter,
  QdrantVectorStoreAdapter,
  DrizzleAuthRepositoryAdapter,
  DrizzleKnowledgeRepositoryAdapter,
  ConsoleLoggerAdapter
} from '@core/infrastructure/adapters';
import { 
  ExtractUserMemoriesUseCase, 
  GetRecentMemoriesUseCase,
  GetInternalUserIdUseCase
} from '@core/application/use-cases';
import { DocumentChunk } from '@core/domain/entities/indexing';

import { TokenUsage } from '@core/domain/entities/chat';

export interface RetrievalEvidence {
  docs: DocumentChunk[];
}

export const runtime = 'nodejs';
export const maxDuration = 60; 

/**
 * Unified Chat Route Handler - Minimalist (No Citations)
 */
export async function POST(req: Request) {
  const logger = new ConsoleLoggerAdapter();
  try {
    const { messages, serviceMode, conversationId } = await req.json();
    if (!serviceMode) return new Response(JSON.stringify({ error: 'Missing serviceMode' }), { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // Composition Root for this request
    const authRepo = new DrizzleAuthRepositoryAdapter();
    const memoryRepo = new DrizzleMemoryRepository();
    const llmProvider = new LLMProviderAdapter();
    const obsPort = new DrizzleObservabilityAdapter();
    const vectorStore = new QdrantVectorStoreAdapter();
    
    const getInternalUserId = new GetInternalUserIdUseCase(authRepo);
    const internalUserId = await getInternalUserId.execute(user.id);
    if (!internalUserId) return new Response(JSON.stringify({ error: 'User not synced' }), { status: 403 });

    const getRecentMemories = new GetRecentMemoriesUseCase(memoryRepo);
    const extractUserMemories = new ExtractUserMemoriesUseCase(llmProvider, memoryRepo, obsPort, logger);

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (obj: { type: string; value?: any; reflection?: string; count?: number }) => 
          controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));

        try {
          const knowledgeRepo = new DrizzleKnowledgeRepositoryAdapter();
          const [allCollections, memories] = await Promise.all([
            knowledgeRepo.listCollections().catch(() => []),
            getRecentMemories.execute(internalUserId, 20)
          ]);
          
          const traceId = await obsPort.startTrace(internalUserId, conversationId).catch(() => null);
          if (traceId) emit({ type: 'trace_id', value: traceId });

          // Phase 1: Reasoning
          const langchainMessages = messages.slice(-10).map((m: { role: string; content: string }) => 
            m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
          );

          let finalState: AgentStateType = {} as AgentStateType;
          const graphStream = await ragGraph.stream({
            messages: langchainMessages,
            mode: serviceMode,
            allCollections,
            userMemories: memories.map(m => m.fact),
            traceId,
          }, {
            configurable: {
              llmProvider,
              vectorStore,
              obsPort,
              logger
            }
          });

          for await (const step of graphStream) {
            const nodeName = Object.keys(step)[0];
            const state = (step as Record<string, any>)[nodeName];
            finalState = { ...finalState, ...state };
            if (state.reflection) emit({ type: 'phase', value: nodeName, reflection: state.reflection });
            
            // Handle Clarification
            if (nodeName === 'analyze_query' && state.questionIsClear === false) {
              const clarificationMsg = state.reflection || "Yêu cầu chưa rõ ràng, bạn có thể giải thích thêm được không?";
              emit({ type: 'content', value: clarificationMsg });
              emitTotalTokens(finalState, null, emit);
              
              if (traceId) {
                waitUntil(obsPort.finalizeTrace(traceId, 'clarification_requested').catch(err => 
                  logger.error('Failed to finalize trace', err, { traceId })
                ));
              }
              
              controller.close();
              return;
            }
          }

          // Phase 2: Generation
          emit({ type: 'phase', value: 'generate' });
          const { client, model, extraBody } = getGenerationProvider();
          
          const userMemoriesStr = memories.map(m => `- ${m.fact}`).join('\n');
          const lastUserMessage = messages[messages.length - 1].content;
          const systemPrompt = buildSystemPrompt(finalState, userMemoriesStr, lastUserMessage);

          const response = await client.chat.completions.create({
            model,
            stream: true,
            stream_options: { include_usage: true },
            messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-10)],
            ...(extraBody ? { extra_body: extraBody } : {}),
          });

          let fullContent = '';
          let finalUsage: TokenUsage | null = null;
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              emit({ type: 'content', value: content });
            }
            if (chunk.usage) {
              finalUsage = {
                prompt_tokens: chunk.usage.prompt_tokens,
                completion_tokens: chunk.usage.completion_tokens,
                total_tokens: chunk.usage.total_tokens,
                cached_tokens: (chunk.usage as any).prompt_tokens_details?.cached_tokens,
                cache_creation_tokens: (chunk.usage as any).prompt_tokens_details?.cache_creation_input_tokens,
              };
            }
          }

          // Finalize background tasks
          finalizeObservability(obsPort, traceId, finalState, fullContent, finalUsage, systemPrompt.length, logger);
          emitTotalTokens(finalState, finalUsage, emit);

          if (internalUserId) {
            const count = await extractUserMemories.execute({ 
              userId: internalUserId, 
              messages, 
              traceId 
            });
            if (count > 0) emit({ type: 'memory_update', count });
          }

          controller.close();
        } catch (error: any) {
          logger.error('[Chat API] Loop Error', error);
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
  } catch (error: any) {
    logger.error('[Chat API] Fatal Error', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

import { AgentStateType } from '@core/agent/state';
import { ILoggerProvider } from '@core/application/ports/logger.port';

function buildSystemPrompt(state: AgentStateType, userMemories: string, lastUserMessage: string): string {
  const evidence = state.evidence;
  const contextSummary = state.context_summary;
  const isChitChat = !!state.isChitChat;

  let knowledgeBlock = '';
  if (evidence && evidence.docs.length > 0) {
    knowledgeBlock = buildRetrievedContext(evidence);
    if (contextSummary) knowledgeBlock += `\n\n# CẤU TRÚC SỰ THẬT (FACT SHEET)\n${contextSummary}`;
  }

  const memoryContext = userMemories 
    ? `\n# THÔNG TIN BỐI CẢNH VỀ NGƯỜI DÙNG\n<user_memories>\n${userMemories}\n</user_memories>\n` 
    : '';

  // Defense 7: Task Anchoring
  const taskAnchor = `\n## CURRENT GOAL\n${lastUserMessage}\n`;

  // Defense 2 & 8: Instruction Re-Injection (Placed near the end)
  const reInjection = `
# CRITICAL REMINDER (RE-INJECTION)
- IDENTITY: You are VMG MATE.
- GROUNDING: Use # KNOWLEDGE CONTEXT only.
- PROACTIVITY: Provide full definitions and procedures directly.
- LANGUAGE: Follow the user's language naturally.
- MATH: Use $ for inline, $$ for block.
  `.trim();

  return `
${MASTER_AGENT_IDENTITY}
${memoryContext}
${taskAnchor}
${isChitChat ? 'Bạn đang trong chế độ "Tán gẫu".' : 
`${AGENT_ORCHESTRATOR_PROMPT(1, 3)}
# STRICT GROUNDING RULE
- TRẢ LỜI dựa trên # KNOWLEDGE CONTEXT. BẮT BUỘC sử dụng nếu có thông tin.`}
${MASTER_OUTPUT_CONSTRAINTS}
# KNOWLEDGE CONTEXT
${knowledgeBlock || "No specific enterprise knowledge found."}

${reInjection}
  `.trim();
}

import { IObservabilityPort } from '@core/application/ports/observability.port';

function finalizeObservability(
  obsPort: IObservabilityPort,
  traceId: string | null, 
  finalState: AgentStateType, 
  content: string, 
  usage: TokenUsage | null, 
  promptLen: number,
  logger: ILoggerProvider
) {
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
        latencyMs: 0
      }).catch(err => logger.error('Failed to emit final_generation span', err, { traceId }));
    }
    await obsPort.finalizeTrace(traceId).catch(err => logger.error('Failed to finalize trace', err, { traceId }));
  })());
}


function emitTotalTokens(
  finalState: AgentStateType, 
  usage: TokenUsage | null, 
  emit: (obj: { type: string; value: any }) => void
) {
  const graphUsage = finalState.totalUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const finalUsage = usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  emit({
    type: 'tokens',
    value: {
      prompt_tokens: (graphUsage.prompt_tokens || 0) + (finalUsage.prompt_tokens || 0),
      completion_tokens: (graphUsage.completion_tokens || 0) + (finalUsage.completion_tokens || 0),
      total_tokens: (graphUsage.total_tokens || 0) + (finalUsage.total_tokens || 0),
    }
  });
}

function buildRetrievedContext(evidence: { docs: DocumentChunk[] }): string {
  const lines = ['<retrieved_context>'];
  evidence.docs.forEach((doc, i) => {
    lines.push(`  <document index="${i}">`);
    lines.push(`    <title>${doc.title}</title>`);
    lines.push(`    <source>${doc.source}</source>`);
    lines.push(`    <silo>${doc.collection}</silo>`);
    lines.push(`    <content>${doc.parentContent || doc.content}</content>`);
    lines.push('  </document>');
  });
  lines.push('</retrieved_context>');
  return lines.join('\n');
}
