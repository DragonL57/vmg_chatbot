import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { getGenerationProvider } from '@/lib/providers';
import { ManagerService } from '@/services/manager.service';
import type { RetrievalEvidence } from '@/services/manager.service';
import { URAS_MANAGER_PROMPT } from '@/prompts/uras';
import { MASTER_AGENT_IDENTITY, MASTER_OUTPUT_CONSTRAINTS } from '@/prompts/master';

export const maxDuration = 300; // Allow 300s for AI operations

const KNOWLEDGE_DIR = join(process.cwd(), 'data', 'knowledge');

/** Rough token estimate: ~3.5 chars per token (accounts for Vietnamese subword tokenization). */
const estTokens = (s: string) => Math.round(s.length / 3.5);

// Loads all static.md files into a domain→content map (called once per request).
// Filtering to only relevant domains happens after retrieval — no extra LLM call needed.
function loadStaticMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(KNOWLEDGE_DIR)) return map;
  for (const name of readdirSync(KNOWLEDGE_DIR)) {
    const dir = join(KNOWLEDGE_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    const staticFile = join(dir, 'static.md');
    if (!existsSync(staticFile)) continue;
    const content = readFileSync(staticFile, 'utf-8').trim();
    if (content) map.set(name, content);
  }
  return map;
}

// Builds the <knowledge_overview> block using only the matched domains.
function buildStaticOverview(staticMap: Map<string, string>, domains: Set<string>): string {
  const sections: string[] = [];
  for (const domain of domains) {
    const content = staticMap.get(domain);
    if (content) sections.push(`### ${domain}\n${content}`);
  }
  if (sections.length === 0) return '';
  console.log(`[StaticOverview] Injecting ${sections.length} domain(s): ${[...domains].join(', ')}`);
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

    const staticMap = loadStaticMap();

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

          let knowledgeBlock = '';
          let staticOverview = '';
          if (evidence && (evidence.docs.length > 0 || evidence.faqs.length > 0)) {
            knowledgeBlock = buildRetrievedContext(evidence);
            console.log(`[URASys] ${evidence.docs.length} docs, ${evidence.faqs.length} FAQs retrieved`);
            // Determine which domains contributed evidence, inject only those static files
            const evidenceDomains = new Set<string>();
            for (const doc of evidence.docs) {
              const match = doc.source.match(/data\/knowledge\/([^/]+)\//);
              if (match) evidenceDomains.add(match[1]);
            }
            staticOverview = buildStaticOverview(staticMap, evidenceDomains);
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

          // ── Token budget breakdown (estimated) ─────────────────────────────
          const historyText = recentMessages.map((m: { role: string; content: string }) => m.content).join(' ');
          const urasPrompt = URAS_MANAGER_PROMPT(1, 3);
          const breakdown = {
            identity:    estTokens(MASTER_AGENT_IDENTITY),
            static:      estTokens(staticOverview),
            knowledge:   estTokens(knowledgeBlock),
            constraints: estTokens(MASTER_OUTPUT_CONSTRAINTS),
            uras:        estTokens(urasPrompt),
            history:     estTokens(historyText),
            systemTotal: estTokens(augmentedContext),
          };
          console.log(
            `[Tokens:est] system=${breakdown.systemTotal}` +
            ` | identity=${breakdown.identity}` +
            ` | static=${breakdown.static}` +
            ` | knowledge=${breakdown.knowledge}` +
            ` | constraints=${breakdown.constraints}` +
            ` | uras=${breakdown.uras}` +
            ` | history=${breakdown.history}` +
            ` | total_est=${breakdown.systemTotal + breakdown.history}`
          );

          // -- Phase 3: Generate --------------------------------------------------
          const { client: genClient, model: genModel, provider: genProvider, extraBody } = getGenerationProvider();
          console.log(`[Generate] provider=${genProvider} model=${genModel}${extraBody ? ' extra='+JSON.stringify(extraBody) : ''}`);
          const completion = await genClient.chat.completions.create({
            model: genModel,
            stream: true,
            stream_options: { include_usage: true },
            messages: [
              { role: 'system', content: augmentedContext },
              ...recentMessages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            ],
            ...(extraBody ? { extra_body: extraBody } : {}),
          });

          let usageData: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;

          for await (const chunk of completion) {
            if (chunk.usage) {
              usageData = {
                prompt_tokens: chunk.usage.prompt_tokens,
                completion_tokens: chunk.usage.completion_tokens,
                total_tokens: chunk.usage.total_tokens,
              };
            }
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }

          if (usageData) {
            console.log(
              `[Tokens:actual] input=${usageData.prompt_tokens}` +
              ` output=${usageData.completion_tokens}` +
              ` total=${usageData.total_tokens}`
            );
            emit(`__TOKENS__:${usageData.prompt_tokens}:${usageData.completion_tokens}:${usageData.total_tokens}`);
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

const MAX_DOC_CHARS = 1200;  // ~340 tokens per doc
const MAX_FAQ_CHARS = 400;   // ~114 tokens per FAQ answer

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...[truncated]' : s;
}

function buildRetrievedContext(evidence: RetrievalEvidence): string {
  const lines: string[] = ['<retrieved_context>'];

  if (evidence.docs.length > 0) {
    lines.push('  <documents>');
    for (const doc of evidence.docs) {
      lines.push(`    <document score="${doc.score.toFixed(3)}">`);
      lines.push(`      <title>${escapeXml(doc.title)}</title>`);
      lines.push(`      <content>${escapeXml(truncate(doc.content, MAX_DOC_CHARS))}</content>`);
      lines.push('    </document>');
    }
    lines.push('  </documents>');
  }

  if (evidence.faqs.length > 0) {
    lines.push('  <faqs>');
    for (const faq of evidence.faqs) {
      lines.push(`    <faq score="${faq.score.toFixed(3)}">`);
      lines.push(`      <question>${escapeXml(faq.question)}</question>`);
      lines.push(`      <answer>${escapeXml(truncate(faq.answer, MAX_FAQ_CHARS))}</answer>`);
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