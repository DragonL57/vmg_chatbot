import { getGenerationProvider } from '@core/lib/providers';
import { AGENT_ORCHESTRATOR_PROMPT } from '@core/prompts/rag-agents';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@core/prompts/master';
import { ragGraph } from '@core/agent/rag-graph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { RetrievalEvidence } from '@core/services/manager.service';
import { listCollections } from '@core/services/supabase.service';

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

  // Fetch all collections for the router node in Auto Mode
  const allCollections = await listCollections().catch(() => []);

  const langchainMessages = recentMessages.map((m: { role: string; content: string }) => 
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: any) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'));

      try {
        // ── Phase 1: Agentic Flow ───────────────────────────────────────────
        let finalState: any = {};
        const graphStream = await ragGraph.stream({
          messages: langchainMessages,
          mode: serviceMode,
          allCollections: allCollections,
        });

        for await (const step of graphStream) {
          const nodeName = Object.keys(step)[0];
          const state = (step as Record<string, any>)[nodeName];
          finalState = { ...finalState, ...state };
          
          // Emit signal with details if available
          const payload: any = { type: 'phase', value: nodeName };
          if (nodeName === 'router' && state.targetCollections) {
            // Find display names for the selected IDs
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

        let knowledgeBlock = '';
        if (contextSummary) {
          knowledgeBlock = `<retrieved_facts>\n${contextSummary}\n</retrieved_facts>`;
        } else if (evidence && evidence.docs.length > 0) {
          knowledgeBlock = buildRetrievedContext(evidence);
        }

        // ── Phase 2: Final Generation ───────────────────────────────────────
        emit({ type: 'phase', value: 'generate' });
        const { client, model, extraBody } = getGenerationProvider();
        
        const systemPrompt = `
${MASTER_AGENT_IDENTITY}
${AGENT_ORCHESTRATOR_PROMPT(1, 3)}

# STRICT GROUNDING RULE
- ONLY answer using the # KNOWLEDGE CONTEXT.
- If information is missing or incomplete, do NOT just say you don't know. Instead, politely ask the user to provide more specific details or context (e.g., which program, which year, or which department) so you can help them better.

${MASTER_OUTPUT_CONSTRAINTS}

# KNOWLEDGE CONTEXT
${knowledgeBlock || "No specific enterprise knowledge found for this query."}
        `.trim();

        const inputChars = systemPrompt.length + JSON.stringify(recentMessages).length;
        console.log(`[PAYLOAD] FinalGen     | In: ${inputChars.toLocaleString().padStart(6)} chars | Pending Out...`);

        const response = await client.chat.completions.create({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...recentMessages,
          ],
          ...(extraBody ? { extra_body: extraBody } : {}),
        });

        let fullContent = '';
        let usage: any = null;
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            emit({ type: 'content', value: content });
          }
          if (chunk.usage) usage = chunk.usage;
        }

        console.log(`[PAYLOAD] FinalGen     | Out: ${fullContent.length.toLocaleString().padStart(5)} chars`);

        // Emit final tokens if captured
        if (usage) {
           emit({ type: 'tokens', value: usage });
        }

      } catch (error) {
        console.error('[Chat API] Error:', error);
        emit({ type: 'error', value: 'Đã có lỗi xảy ra trong quá trình xử lý.' });
      } finally {
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
