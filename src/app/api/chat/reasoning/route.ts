import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { listCollections } from '@core/services/supabase.service';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { getInternalUserId } from '@core/services/auth.service';
import { MemoryService } from '@core/services/memory.service';
import { ObservabilityService } from '@core/services/observability.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Stage 1: Agentic Reasoning Stream
 * Executes LangGraph and streams phases to UI.
 */
export async function POST(req: Request) {
  try {
    const { messages, serviceMode, conversationId } = await req.json();

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const internalUserId = await getInternalUserId(user.id);
    if (!internalUserId) return new Response(JSON.stringify({ error: 'User not synced' }), { status: 403 });

    const [allCollections, memories] = await Promise.all([
      listCollections().catch(() => []),
      MemoryService.getUserMemories(internalUserId, 20)
    ]);

    const traceId = await ObservabilityService.startTrace(internalUserId, conversationId).catch(() => null);

    const langchainMessages = messages.slice(-10).map((m: any) => 
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (obj: any) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));
        if (traceId) emit({ type: 'trace_id', value: traceId });

        try {
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

            if (nodeName === 'router_expand' && state.targetCollections) {
              const displayNames = state.targetCollections.map((id: string) => {
                const col = allCollections.find(c => c.qdrantName === id);
                return col ? col.name : id;
              });
              payload.detail = displayNames.join(', ');
            }
            emit(payload);
          }

          // Final event contains the full state needed for Stage 2
          emit({ 
            type: 'reasoning_complete', 
            finalState, 
            internalUserId, 
            userMemoriesStr: memories.map(m => `- ${m.fact}`).join('\n') 
          });

          controller.close();
        } catch (error: any) {
          console.error('[Reasoning API] Graph Error:', error);
          emit({ type: 'error', value: 'Lỗi trong quá trình suy luận.' });
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });

  } catch (error) {
    console.error('[Reasoning API] Fatal Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
