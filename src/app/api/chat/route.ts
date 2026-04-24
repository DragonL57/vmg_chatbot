import { getGenerationProvider, ProviderResult } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import type { RetrievalEvidence } from '@core/services/manager.service';
import { listCollections } from '@core/services/supabase.service';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { MemoryService } from '@core/services/memory.service';
import { getInternalUserId } from '@core/services/auth.service';
import { estimateTokens } from '@core/lib/utils';
import { ObservabilityService } from '@core/services/observability.service';
import { waitUntil } from '@vercel/functions';

export const runtime = 'nodejs';
export const maxDuration = 60; // Reverted to 60s per user request

/**
 * Main Chat Route Handler
 */
export async function POST(req: Request) {
  try {
    const { messages, serviceMode, conversationId } = await req.json();
    if (!serviceMode) return new Response(JSON.stringify({ error: 'Missing serviceMode' }), { status: 400 });

    // 1. Parallel Initialization
    const [authResult, allCollections] = await Promise.all([
      handleAuth(),
      listCollections().catch(() => []),
    ]);

    if (!authResult.user || !authResult.internalUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { internalUserId } = authResult;

    // 2. Parallel Secondary Init
    const [memoriesResult, traceId] = await Promise.all([
      MemoryService.getUserMemories(internalUserId, 20),
      ObservabilityService.startTrace(internalUserId, conversationId).catch(() => null)
    ]);

    const userMemoriesStr = memoriesResult.map(m => `- ${m.fact}`).join('\n');

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (obj: any) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));
        if (traceId) emit({ type: 'trace_id', value: traceId });

        try {
          // 1. Run Agentic Reasoning Graph
          const finalState = await runReasoningGraph(messages, serviceMode, allCollections, memoriesResult, traceId, emit);
          
          // 2. Build Final System Prompt
          const systemPrompt = buildSystemPrompt(finalState, userMemoriesStr);

          // 3. Perform Final Generation
          const { fullContent, finalUsage } = await performGeneration(systemPrompt, messages.slice(-10), emit);

          // 4. Handle Post-Response Observability (Background)
          finalizeObservability(traceId, finalState, fullContent, finalUsage, systemPrompt.length);

          // 5. Final Accumulation & Memory Extraction (Out-of-band)
          emitTotalTokens(finalState, finalUsage, emit);
          triggerMemoryCurator(internalUserId, messages, traceId);

          controller.close();
        } catch (error: any) {
          console.error('[Chat API] Loop Error:', error);
          if (traceId) ObservabilityService.finalizeTrace(traceId, error.message).catch(console.error);
          emit({ type: 'error', value: 'Đã có lỗi xảy ra trong quá trình xử lý.' });
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
  } catch (error) {
    console.error('[Chat API] Fatal Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

/**
 * Auth Helper
 */
async function handleAuth() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, internalUserId: null };
  const internalUserId = await getInternalUserId(user.id);
  return { user, internalUserId };
}

/**
 * Runs the LangGraph reasoning flow
 */
async function runReasoningGraph(
  messages: any[], 
  serviceMode: string, 
  allCollections: any[], 
  memories: any[], 
  traceId: string | null,
  emit: (obj: any) => void
) {
  const langchainMessages = messages.slice(-10).map((m: any) => 
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  let finalState: any = {};
  const graphStream = await ragGraph.stream({
    messages: langchainMessages,
    mode: serviceMode,
    allCollections,
    userMemories: memories.map(m => m.fact),
    traceId,
  });

  for await (const step of graphStream) {
    const nodeName = Object.keys(step)[0];
    const state = (step as Record<string, any>)[nodeName];
    finalState = { ...finalState, ...state };
    
    const payload: any = { type: 'phase', value: nodeName };
    if (state.reflection) payload.reflection = state.reflection;

    if (nodeName === 'router' && state.targetCollections) {
      const displayNames = state.targetCollections.map((id: string) => {
        const col = allCollections.find(c => c.qdrantName === id);
        return col ? col.name : id;
      });
      payload.detail = displayNames.join(', ');
    }
    emit(payload);
  }
  return finalState;
}

/**
 * Constructs the complex system prompt
 */
function buildSystemPrompt(state: any, userMemories: string): string {
  const evidence = state.evidence as RetrievalEvidence;
  const contextSummary = state.context_summary as string;
  const isChitChat = !!state.isChitChat;

  let knowledgeBlock = '';
  if (evidence && evidence.docs.length > 0) {
    knowledgeBlock = buildRetrievedContext(evidence);
    if (contextSummary) knowledgeBlock += `\n\n# CẤU TRÚC SỰ THẬT (FACT SHEET)\n${contextSummary}`;
  }

  const memoryContext = userMemories 
    ? `\n# THÔNG TIN BỐI CẢNH VỀ NGƯỜI DÙNG (READ-ONLY)\n<user_memories>\n${userMemories}\n</user_memories>\n` 
    : '';

  return `
${MASTER_AGENT_IDENTITY}${memoryContext}
${isChitChat ? 'Bạn đang trong chế độ "Tán gẫu". Hãy phản hồi thân thiện.' : 
`${AGENT_ORCHESTRATOR_PROMPT(1, 3)}
# STRICT GROUNDING RULE
- TRẢ LỜI dựa trên # KNOWLEDGE CONTEXT. BẮT BUỘC sử dụng nếu có thông tin.`}
${MASTER_OUTPUT_CONSTRAINTS}
# KNOWLEDGE CONTEXT
${knowledgeBlock || "No specific enterprise knowledge found."}
  `.trim();
}

/**
 * Performs the actual LLM call and streaming
 */
async function performGeneration(systemPrompt: string, recentMessages: any[], emit: (obj: any) => void) {
  const { client, model, extraBody } = getGenerationProvider();
  
  const messagesToModel: any[] = [];
  if (estimateTokens(systemPrompt) > 1024) {
    messagesToModel.push({
      role: 'system',
      content: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
    });
  } else {
    messagesToModel.push({ role: 'system', content: systemPrompt });
  }
  messagesToModel.push(...recentMessages);

  const response = await client.chat.completions.create({
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: messagesToModel,
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  let fullContent = '';
  let finalUsage: any = null;
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullContent += content;
      emit({ type: 'content', value: content });
    }
    if (chunk.usage) {
      finalUsage = chunk.usage;
      if (finalUsage.prompt_tokens_details) {
        const { cached_tokens, cache_creation_input_tokens } = finalUsage.prompt_tokens_details;
        if (cached_tokens > 0 || cache_creation_input_tokens > 0) {
           console.log(`[CACHE] Hit: ${cached_tokens || 0} | New: ${cache_creation_input_tokens || 0}`);
        }
      }
    }
  }
  return { fullContent, finalUsage };
}

/**
 * Finalizes Span and Trace in the background
 */
function finalizeObservability(traceId: string | null, finalState: any, content: string, usage: any, promptLen: number) {
  if (!traceId) return;
  const { model } = getGenerationProvider();
  
  waitUntil((async () => {
    // 1. Emit generation span
    if (usage) {
      await ObservabilityService.emitSpan(traceId, {
        nodeName: 'final_generation',
        model,
        input: { promptChars: promptLen },
        output: content,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        cachedTokens: usage.prompt_tokens_details?.cached_tokens || 0,
        cacheCreationTokens: usage.prompt_tokens_details?.cache_creation_input_tokens || 0,
        latencyMs: 0 // Placeholder
      }).catch(console.error);
    }
    // 2. Close trace
    await ObservabilityService.finalizeTrace(traceId).catch(console.error);
  })());
}

/**
 * Memory curator trigger using waitUntil
 */
function triggerMemoryCurator(userId: string, messages: any[], traceId: string | null) {
  waitUntil(MemoryService.extractAndSaveMemories(userId, messages, traceId).catch(console.error));
}

/**
 * Helper to emit summed tokens to UI
 */
function emitTotalTokens(finalState: any, usage: any, emit: (obj: any) => void) {
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

function buildRetrievedContext(evidence: RetrievalEvidence): string {
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
