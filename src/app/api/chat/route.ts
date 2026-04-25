import { getGenerationProvider } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import type { RetrievalEvidence } from '@core/services/manager.service';
import { MemoryService } from '@core/services/memory.service';
import { estimateTokens } from '@core/lib/utils';
import { ObservabilityService } from '@core/services/observability.service';
import { waitUntil } from '@vercel/functions';

export const runtime = 'nodejs';
export const maxDuration = 60; 

/**
 * Stage 2: Final Generation
 * Receives reasoning results and streams the final answer.
 */
export async function POST(req: Request) {
  try {
    const { 
      messages, 
      finalState, 
      traceId, 
      internalUserId, 
      userMemoriesStr 
    } = await req.json();

    if (!finalState) return new Response(JSON.stringify({ error: 'Missing reasoning state' }), { status: 400 });

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (obj: any) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));

        try {
          // 1. Build Final System Prompt
          const systemPrompt = buildSystemPrompt(finalState, userMemoriesStr);

          // 2. Perform Final Generation
          emit({ type: 'phase', value: 'generate' });
          const genStartTime = Date.now();
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
          messagesToModel.push(...messages.slice(-10));

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
            if (chunk.usage) finalUsage = chunk.usage;
          }

          // 3. Handle Post-Response Tasks
          finalizeObservability(traceId, finalState, fullContent, finalUsage, systemPrompt.length);
          
          // 4. Emit Total Tokens to UI
          emitTotalTokens(finalState, finalUsage, emit);

          if (internalUserId) {
            try {
              const count = await MemoryService.extractAndSaveMemories(internalUserId, messages, traceId);
              if (count > 0) emit({ type: 'memory_update', count });
            } catch (err) {
              console.error('[Memory Extraction] Failed:', err);
            }
          }

          controller.close();
        } catch (error: any) {
          console.error('[Chat Generation API] Error:', error);
          if (traceId) ObservabilityService.finalizeTrace(traceId, error.message).catch(console.error);
          emit({ type: 'error', value: 'Đã có lỗi xảy ra trong quá trình tạo câu trả lời.' });
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
 * Constructs the complex system prompt (Stage 2)
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

function finalizeObservability(traceId: string | null, finalState: any, content: string, usage: any, promptLen: number) {
  if (!traceId) return;
  const { model } = getGenerationProvider();
  
  waitUntil((async () => {
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
        latencyMs: 0
      }).catch(console.error);
    }
    await ObservabilityService.finalizeTrace(traceId).catch(console.error);
  })());
}

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
