import { getGenerationProvider } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { waitUntil } from '@vercel/functions';
import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { DocumentPassage } from '@core/domain/entities/indexing';
import { TokenUsage } from '@core/domain/entities/chat';
import { AgentStateType } from '@core/agent/state';
import { ILoggerProvider } from '@core/application/ports/logger.port';
import { IObservabilityPort } from '@core/application/ports/observability.port';
import { ILLMProvider } from '@core/application/ports/llm-provider.port';
import { UserMemory } from '@core/domain/entities/memory';
import { ExtractUserMemoriesUseCase } from '@core/application/use-cases';

// ─── Reasoning Graph ────────────────────────────────────────────────────────

export async function runReasoningGraph(
  params: { messages: { role: string; content: string }[]; memories: UserMemory[]; traceId: string | null },
  config: { llmProvider: ILLMProvider; obsPort: IObservabilityPort; logger: ILoggerProvider },
  emit: (obj: { type: string; value?: unknown; reflection?: string }) => void,
): Promise<{ finalState: AgentStateType; earlyExit: boolean }> {
  const { messages, memories, traceId } = params;
  const langchainMessages = messages.slice(-10).map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
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
      emit({ type: 'content', value: state.reflection || 'Yêu cầu chưa rõ ràng.' });
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

// ─── Generation Phase ───────────────────────────────────────────────────────

export async function runGenerationPhase(
  params: {
    finalState: AgentStateType; messages: { role: string; content: string }[];
    memories: UserMemory[]; traceId: string | null; internalUserId: string;
  },
  config: {
    llmProvider: ILLMProvider; obsPort: IObservabilityPort;
    extractUserMemories: ExtractUserMemoriesUseCase; logger: ILoggerProvider;
  },
  emit: (obj: { type: string; value?: unknown; count?: number }) => void,
): Promise<void> {
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

// ─── Prompt Builder ─────────────────────────────────────────────────────────

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
${knowledgeBlock || 'No specific enterprise knowledge found.'}
## CURRENT GOAL: ${lastUserMessage}
  `.trim();
}

// ─── Observability Helpers ──────────────────────────────────────────────────

function finalizeObservability(
  obsPort: IObservabilityPort, traceId: string | null, content: string,
  usage: TokenUsage | null, promptLen: number, logger: ILoggerProvider,
  latencyMs: number, searchPath?: string,
): void {
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
        latencyMs,
      }).catch(err => logger.error('Final span fail', err));
    }
    await obsPort.finalizeTrace(traceId, undefined, searchPath).catch(err => logger.error('Finalize fail', err));
  })());
}

export function emitTotalTokens(
  finalState: AgentStateType, usage: TokenUsage | null,
  emit: (obj: { type: string; value: unknown }) => void,
): void {
  const g = finalState.totalUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const f = usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  emit({
    type: 'tokens',
    value: {
      prompt_tokens: (g.prompt_tokens || 0) + (f.prompt_tokens || 0),
      completion_tokens: (g.completion_tokens || 0) + (f.completion_tokens || 0),
      total_tokens: (g.total_tokens || 0) + (f.total_tokens || 0),
    },
  });
}

// ─── Context Builder ────────────────────────────────────────────────────────

export function buildRetrievedContext(evidence: { docs: DocumentPassage[] }): string {
  return `<retrieved_context>\n${evidence.docs.map((doc, i) =>
    `  <document index="${i}">\n    <title>${doc.title}</title>\n    <source>${doc.source}</source>\n    <path>${doc.parentContent || ''}</path>\n    <content>${doc.content}</content>\n  </document>`,
  ).join('\n')}\n</retrieved_context>`;
}
