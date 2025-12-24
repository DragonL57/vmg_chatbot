import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ManagerService } from '@/services/manager.service';
import { SearchService } from '@/services/search.service';
import { LeadService } from '@/services/lead.service';
import fs from 'fs';
import path from 'path';
import { 
  MASTER_AGENT_IDENTITY, 
  MASTER_CUSTOMER_INSIGHT, 
  MASTER_OUTPUT_CONSTRAINTS, 
  MASTER_EXECUTION_PROTOCOL_AMBIGUOUS, 
  MASTER_EXECUTION_PROTOCOL_RESPONSE,
  MASTER_EXECUTION_PROTOCOL_INSUFFICIENT_DATA
} from '@/prompts/master';

export const maxDuration = 300; // Allow 300s for RAG operations

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
        return new Response('No messages provided', { status: 400 });
    }

    // 1. Dispatcher Analysis (Guardrails + Decomposing merged for speed)
    const decomposition = await ManagerService.decompose(messages);

    if (!decomposition.isSafe) {
      return new Response(decomposition.safetyReason || "Yêu cầu bị từ chối do vi phạm chính sách.", { status: 400 });
    }

    // 1b. Lead Capture (Async - don't block the UI)
    if (decomposition.extractedLead) {
      LeadService.saveLead(decomposition.extractedLead).catch(err => 
        console.error('Failed to save lead info:', err)
      );
    }

    // Load static knowledge from file
    let staticKnowledgeContent = "";
    try {
      const knowledgePath = path.join(process.cwd(), 'data', 'knowledge', 'vmg-overview.md');
      staticKnowledgeContent = fs.readFileSync(knowledgePath, 'utf-8');
    } catch (err) {
      console.error("Failed to load static knowledge:", err);
    }

    let systemContext = `
${MASTER_AGENT_IDENTITY}

<knowledge_base>
${staticKnowledgeContent}
</knowledge_base>

${MASTER_CUSTOMER_INSIGHT}

${MASTER_OUTPUT_CONSTRAINTS}
`.trim();

    if (decomposition.isAmbiguous) {
      systemContext += `\n\n${MASTER_EXECUTION_PROTOCOL_AMBIGUOUS(decomposition.clarificationQuestion || '')}`;
    } else if (decomposition.canAnswerFromStatic) {
      // 2. BYPASS RAG (Static Knowledge is sufficient)
      systemContext += `\n\n${MASTER_EXECUTION_PROTOCOL_RESPONSE}`;
      console.log('--- BYPASSING RAG: Answer found in static knowledge ---');
    } else {
      // 2. Retrieval (Parallel Execution)
      const primaryQuery = decomposition.subQueries[0] || lastMessage.content;
      
      const [docResults, faqResults] = await Promise.all([
        SearchService.searchDocuments(primaryQuery),
        SearchService.searchFaqs(lastMessage.content)
      ]);

      // Calculate Confidence (Optimized URASys Path B)
      const maxDocScore = docResults.length > 0 ? docResults[0].score : 0;
      const maxFaqScore = faqResults.length > 0 ? faqResults[0].score : 0;
      const confidenceThreshold = 0.65; // Bar for "useful" information

      const hasSufficientData = maxDocScore > confidenceThreshold || maxFaqScore > confidenceThreshold;

      const contextBlock = docResults.length > 0 
        ? docResults.map(r => r.content).join('\n\n')
        : "Không tìm thấy tài liệu liên quan.";
        
      const faqBlock = faqResults.length > 0
        ? faqResults.map(f => f.content).join('\n\n')
        : "Không tìm thấy FAQ liên quan.";

      systemContext += `
<retrieved_context>
[THÔNG TIN CHI TIẾT]
${contextBlock}

[CÂU HỎI THƯỜNG GẶP]
${faqBlock}
</retrieved_context>`;

      if (hasSufficientData) {
        systemContext += `\n\n${MASTER_EXECUTION_PROTOCOL_RESPONSE}`;
      } else {
        // Signal insufficient data protocol to prevent hallucinations
        systemContext += `\n\n${MASTER_EXECUTION_PROTOCOL_INSUFFICIENT_DATA}`;
      }
    }

    // 3. Generate Response Stream
    const completion = await poe.chat.completions.create({
      model: DEFAULT_POE_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: systemContext },
        ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      ],
    });

    // Create a readable stream from the OpenAI stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-URASys-Ambiguous': decomposition.isAmbiguous ? 'true' : 'false',
    };

    if (decomposition.extractedLead && (decomposition.extractedLead.phone || decomposition.extractedLead.name)) {
      // Encode lead data to base64 to safely pass through headers
      const leadJson = JSON.stringify(decomposition.extractedLead);
      responseHeaders['X-Lead-Data'] = Buffer.from(leadJson).toString('base64');
    }

    return new Response(stream, {
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}