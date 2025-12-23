import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ManagerService } from '@/services/manager.service';
import { SearchService } from '@/services/search.service';

export const maxDuration = 60; // Allow 60s for RAG operations

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
        return new Response('No messages provided', { status: 400 });
    }

    // 1. Manager Analysis
    const decomposition = await ManagerService.decompose(lastMessage.content);

    let systemContext = "You are a helpful assistant for VMG English Center (Unified Retrieval Agent-Based System).";

    if (decomposition.isAmbiguous) {
      systemContext += `\n\nThe user's query is ambiguous. You must ask the following clarification question to understand their intent:\n"${decomposition.clarificationQuestion}"\n\nReasoning: ${decomposition.reasoning}`;
    } else {
      // 2. Retrieval
      const primaryQuery = decomposition.subQueries[0] || lastMessage.content;
      
      const [docResults, faqResults] = await Promise.all([
        SearchService.searchDocuments(primaryQuery),
        SearchService.searchFaqs(lastMessage.content)
      ]);

      // Format Context
      const contextBlock = docResults.length > 0 
        ? docResults.map(r => `[Document Source: ${r.source}]\n${r.content}`).join('\n\n')
        : "No relevant documents found.";
        
      const faqBlock = faqResults.length > 0
        ? faqResults.map(f => `[FAQ]\n${f.content}`).join('\n\n')
        : "No relevant FAQs found.";

      systemContext += `\n\nContext Information:\n${contextBlock}\n${faqBlock}\n\nInstructions:\nAnswer the user's question using ONLY the context provided above. If the answer is not in the context, politely state that you do not have that information based on the current documents. Do not hallucinate.`;
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-URASys-Ambiguous': decomposition.isAmbiguous ? 'true' : 'false',
      },
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
