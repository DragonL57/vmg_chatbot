import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ManagerService } from '@/services/manager.service';
import { LeadService } from '@/services/lead.service';
import { CollegeScorecardService } from '@/services/college-scorecard.service';
import fs from 'fs';
import path from 'path';
import { 
  MASTER_AGENT_IDENTITY, 
  MASTER_CUSTOMER_INSIGHT, 
  MASTER_OUTPUT_CONSTRAINTS, 
  MASTER_EXECUTION_PROTOCOL_AMBIGUOUS, 
  MASTER_EXECUTION_PROTOCOL_RESPONSE
} from '@/prompts/master';
import {
  MASTER_STUDY_ABROAD_IDENTITY,
  MASTER_STUDY_ABROAD_KYC_GUIDE,
  MASTER_STUDY_ABROAD_OUTPUT_CONSTRAINTS,
  MASTER_STUDY_ABROAD_EXECUTION_PROTOCOL
} from '@/prompts/study-abroad-master';

export const maxDuration = 300; // Allow 300s for RAG operations

export async function POST(req: Request) {
  try {
    const { messages, serviceMode = 'esl' } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
        return new Response('No messages provided', { status: 400 });
    }

    // Optimization: Only use the last 10 messages for context to save tokens
    const recentMessages = messages.slice(-10);

    // 1. Dispatcher Analysis (Guardrails + Decomposing merged for speed)
    const decomposition = await ManagerService.decompose(recentMessages);

    if (!decomposition.isSafe) {
      return new Response("⚠️ Cảnh báo vi phạm chính sách an toàn", { status: 200 });
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
      const knowledgeFile = serviceMode === 'study-abroad' ? 'study-abroad-overview.md' : 'vmg-overview.md';
      const knowledgePath = path.join(process.cwd(), 'data', 'knowledge', knowledgeFile);
      if (fs.existsSync(knowledgePath)) {
        staticKnowledgeContent = fs.readFileSync(knowledgePath, 'utf-8');
      }
    } catch (err) {
      console.error("Failed to load static knowledge:", err);
    }

    const currentTime = new Date().toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    });

    let baseSystemContext = "";
    
    if (serviceMode === 'study-abroad') {
      baseSystemContext = `\n${MASTER_STUDY_ABROAD_IDENTITY}\n\n<current_time>\nBây giờ là: ${currentTime}\n</current_time>\n\n<knowledge_base>\n${staticKnowledgeContent}\n</knowledge_base>\n\n${MASTER_STUDY_ABROAD_KYC_GUIDE}\n\n${MASTER_STUDY_ABROAD_OUTPUT_CONSTRAINTS}\n`.trim();
    } else {
      baseSystemContext = `\n${MASTER_AGENT_IDENTITY}\n\n<current_time>\nBây giờ là: ${currentTime}\n</current_time>\n\n<knowledge_base>\n${staticKnowledgeContent}\n</knowledge_base>\n\n${MASTER_CUSTOMER_INSIGHT}\n\n${MASTER_OUTPUT_CONSTRAINTS}\n`.trim();
    }

    if (decomposition.isAmbiguous) {
      baseSystemContext += `\n\n${MASTER_EXECUTION_PROTOCOL_AMBIGUOUS(decomposition.clarificationQuestion || '')}`;
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-URASys-Ambiguous': decomposition.isAmbiguous ? 'true' : 'false',
    };

    if (decomposition.extractedLead && (decomposition.extractedLead.phone || decomposition.extractedLead.name)) {
      const leadJson = JSON.stringify(decomposition.extractedLead);
      responseHeaders['X-Lead-Data'] = Buffer.from(leadJson).toString('base64');
    }

    // 3. Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          let augmentedContext = baseSystemContext;

          // 3a. Handle External API Call inside stream to signal UI
          if (decomposition.externalApiCall?.api === 'college-scorecard' && decomposition.externalApiCall.parameters) {
            controller.enqueue(encoder.encode('__TOOL_CALL_START__'));
            const results = await CollegeScorecardService.searchSchools(decomposition.externalApiCall.parameters as Record<string, string>);
            
            if (results.length > 0) {
              augmentedContext += `\n\n<external_api_results>\n${JSON.stringify(results, null, 2)}\n</external_api_results>`;
            } else {
              augmentedContext += `\n\n<external_api_results>\nKhông tìm thấy thông tin phù hợp.\n</external_api_results>`;
            }
            controller.enqueue(encoder.encode('__TOOL_CALL_DONE__'));
          }

          // 3b. Final Protocol Selection (Since RAG is gone, we either use Static or Tool results)
          const executionProtocol = serviceMode === 'study-abroad' ? MASTER_STUDY_ABROAD_EXECUTION_PROTOCOL : MASTER_EXECUTION_PROTOCOL_RESPONSE;
          augmentedContext += `\n\n${executionProtocol}`;

          // 3c. Call Poe Completion
          const completion = await poe.chat.completions.create({
            model: DEFAULT_POE_MODEL,
            stream: true,
            messages: [
              { role: 'system', content: augmentedContext },
              ...recentMessages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            ],
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: responseHeaders,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('CRITICAL ERROR IN CHAT ROUTE:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: err?.message || 'Unknown error' 
    }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}