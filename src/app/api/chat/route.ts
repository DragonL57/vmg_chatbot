import { getGenerationProvider } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { RetrievalEvidence } from '@core/services/manager.service';
import { listCollections } from '@core/services/supabase.service';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { MemoryService } from '@core/services/memory.service';
import { getInternalUserId } from '@core/services/auth.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; 

/**
 * Agentic RAG Chat Route - Structured JSON Stream
 */
export async function POST(req: Request) {
  const { messages, serviceMode } = await req.json();
  const recentMessages = messages.slice(-10);

  if (!serviceMode) {
    return new Response(JSON.stringify({ error: 'Missing serviceMode' }), { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Phase 0: Long-term Memory Retrieval (Bounded)
  const internalUserId = await getInternalUserId(user.id);
  if (!internalUserId) {
    return new Response(JSON.stringify({ error: 'User not synced' }), { status: 403 });
  }

  const memories = await MemoryService.getUserMemories(internalUserId, 20);
  const userMemories = memories.map(m => `- ${m.fact}`).join('\n');

  const allCollections = await listCollections().catch(() => []);

  const langchainMessages = recentMessages.map((m: { role: string; content: string }) => 
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: any) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));

      try {
        let finalState: any = {};
        const graphStream = await ragGraph.stream({
          messages: langchainMessages,
          mode: serviceMode,
          allCollections: allCollections,
          userMemories: memories.map(m => m.fact),
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
              return col ? col.name : (id === 'vmg_docs_wiki' ? 'Corporate Wiki' : id);
            });
            payload.detail = displayNames.join(', ');
          }
          emit(payload);
        }

        const evidence = finalState.evidence as RetrievalEvidence;
        const contextSummary = finalState.context_summary as string;
        const isChitChat = !!finalState.isChitChat;

        let knowledgeBlock = '';
        if (contextSummary) {
          knowledgeBlock = `<retrieved_facts>\n${contextSummary}\n</retrieved_facts>`;
        } else if (evidence && evidence.docs.length > 0) {
          knowledgeBlock = buildRetrievedContext(evidence);
        }

        // Phase 2: Final Generation (with Retry)
        emit({ type: 'phase', value: 'generate' });
        const { client, model, extraBody } = getGenerationProvider();
        
        const memoryContext = userMemories 
          ? `\n# THÔNG TIN VỀ NGƯỜI DÙNG (LONG-TERM MEMORY)\n${userMemories}\n` 
          : '';

        let systemPrompt = '';
        if (isChitChat) {
          systemPrompt = `
${MASTER_AGENT_IDENTITY}${memoryContext}
Bạn đang trong chế độ "Tán gẫu" (Chit-chat). 
Hãy phản hồi người dùng một cách thân thiện, tự nhiên và ngắn gọn. 
          `.trim();
        } else {
          systemPrompt = `
${MASTER_AGENT_IDENTITY}${memoryContext}
${AGENT_ORCHESTRATOR_PROMPT(1, 3)}

# STRICT GROUNDING RULE
- ONLY answer using the # KNOWLEDGE CONTEXT.
- If information is missing or incomplete, do NOT just say you don't know. Instead, politely ask the user to provide more specific details or context (e.g., which program, which year, or which department) so you can help them better.

${MASTER_OUTPUT_CONSTRAINTS}

# KNOWLEDGE CONTEXT
${knowledgeBlock || "No specific enterprise knowledge found for this query."}
          `.trim();
        }

        const inputChars = systemPrompt.length + JSON.stringify(recentMessages).length;
        console.log(`[PAYLOAD] FinalGen     | In: ${inputChars.toLocaleString().padStart(6)} chars | Pending Out...`);

        let response = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            response = await client.chat.completions.create({
              model,
              stream: true,
              messages: [
                { role: 'system', content: systemPrompt },
                ...recentMessages,
              ],
              ...(extraBody ? { extra_body: extraBody } : {}),
            });
            break; 
          } catch (err: any) {
            attempts++;
            console.error(`[Chat API] LLM Attempt ${attempts} failed:`, err.message);
            if (attempts >= maxAttempts) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        let fullContent = '';
        let usage: any = null;
        if (response) {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              emit({ type: 'content', value: content });
            }
            if (chunk.usage) usage = chunk.usage;
          }
        }

        console.log(`[PAYLOAD] FinalGen     | Out: ${fullContent.length.toLocaleString().padStart(5)} chars`);

        // Phase 3: Metadata & Citations
        if (evidence && evidence.docs.length > 0) {
          const citationMetadata = evidence.docs.reduce((acc: Record<string, string>, doc) => {
            const sourceKey = doc.source || doc.title;
            const content = doc.parentContent || doc.content;
            if (acc[sourceKey]) {
              if (!acc[sourceKey].includes(content)) {
                acc[sourceKey] += `\n\n--- [Đoạn trích bổ sung] ---\n\n${content}`;
              }
            } else {
              acc[sourceKey] = content;
            }
            return acc;
          }, {});
          emit({ type: 'citations', value: citationMetadata });
        }

        if (usage) emit({ type: 'tokens', value: usage });

        // IMPORTANT: Close stream immediately to stop client loading state
        controller.close();

        // Phase 4: Non-blocking Memory Extraction (Out-of-band)
        if (internalUserId) {
          MemoryService.extractAndSaveMemories(internalUserId, messages).catch(err => {
             console.error('[Background Memory] Extraction failed:', err);
          });
        }

      } catch (error) {
        console.error('[Chat API] Error:', error);
        emit({ type: 'error', value: 'Đã có lỗi xảy ra trong quá trình xử lý.' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
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
