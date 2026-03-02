import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ManagerService } from '@/services/manager.service';
import type { RetrievalEvidence } from '@/services/manager.service';
import { URAS_MANAGER_PROMPT } from '@/prompts/uras';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@/prompts/master';

export const maxDuration = 300; // Allow 300s for AI operations

const KNOWLEDGE_DIR = join(process.cwd(), 'data', 'knowledge');

// Reads all static.md files from data/knowledge/*/ at request time.
// Called per-request so edits are reflected instantly in dev without restart.
function loadStaticOverviews(): string {
  if (!existsSync(KNOWLEDGE_DIR)) return '';
  const sections: string[] = [];
  for (const name of readdirSync(KNOWLEDGE_DIR)) {
    const dir = join(KNOWLEDGE_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const staticFile = join(dir, 'static.md');
    if (!existsSync(staticFile)) continue;
    const content = readFileSync(staticFile, 'utf-8').trim();
    if (content) sections.push(`### ${name}\n${content}`);
  }
  if (sections.length === 0) return '';
  console.log(`[StaticOverview] Loaded ${sections.length} domain(s): ${readdirSync(KNOWLEDGE_DIR).filter(n => existsSync(join(KNOWLEDGE_DIR, n, 'static.md'))).join(', ')}`);
  return `<knowledge_overview>\n${sections.join('\n\n')}\n</knowledge_overview>`;
}

export async function POST(req: Request) {
  try {
    const { messages, serviceMode = 'wiki' } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
        return new Response('No messages provided', { status: 400 });
    }

    // Optimization: Only use the last 10 messages for context to save tokens
    const recentMessages = messages.slice(-10);

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
    };

    const staticOverview = loadStaticOverviews();

    // Everything runs inside the stream so we can emit phase signals to the client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (signal: string) => controller.enqueue(encoder.encode(signal));

        try {
          // ── Phase 1: Decompose ──────────────────────────────────────────────
          emit('__PHASE__:decompose');
          const { decomposition, evidence } = await ManagerService.decomposeWithRetrieval(recentMessages, serviceMode);

          // ── Phase 2: Building context ───────────────────────────────────────
          // (chitchat skips retrieval, so only emit search phase when evidence was attempted)
          if (!decomposition.chitchat) {
            emit('__PHASE__:search');
          }

          let knowledgeBlock = "";
          if (evidence && (evidence.docs.length > 0 || evidence.faqs.length > 0)) {
            knowledgeBlock = buildRetrievedContext(evidence);
            console.log(`[URASys] ${evidence.docs.length} docs, ${evidence.faqs.length} FAQs retrieved`);
          } else {
            console.log(`[URASys] No evidence retrieved — answering without knowledge context`);
          }

          const currentTime = new Date().toLocaleString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
          });

          const augmentedContext = [
            MASTER_AGENT_IDENTITY,
            `<current_time>\nBây giờ là: ${currentTime}\n</current_time>`,
            staticOverview,
            knowledgeBlock,
            MASTER_OUTPUT_CONSTRAINTS,
            URAS_MANAGER_PROMPT(1, 3),
          ].filter(Boolean).join('\n\n').trim();

          // ── Phase 3: Generate ───────────────────────────────────────────────
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

// ─── Helper: Build <retrieved_context> XML block from URASys evidence ─────────

function buildRetrievedContext(evidence: RetrievalEvidence): string {
  const lines: string[] = ['<retrieved_context>'];

  if (evidence.docs.length > 0) {
    lines.push('  <documents>');
    for (const doc of evidence.docs) {
      lines.push(`    <document score="${doc.score.toFixed(3)}">`);
      lines.push(`      <title>${escapeXml(doc.title)}</title>`);
      lines.push(`      <content>${escapeXml(doc.content)}</content>`);
      lines.push('    </document>');
    }
    lines.push('  </documents>');
  }

  if (evidence.faqs.length > 0) {
    lines.push('  <faqs>');
    for (const faq of evidence.faqs) {
      lines.push(`    <faq score="${faq.score.toFixed(3)}">`);
      lines.push(`      <question>${escapeXml(faq.question)}</question>`);
      lines.push(`      <answer>${escapeXml(faq.answer)}</answer>`);
      lines.push('    </faq>');
    }
    lines.push('  </faqs>');
  }

  lines.push('</retrieved_context>');
  return lines.join('\n');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}