import { PoeService } from './poe.service';
import { QueryDecompositionSchema, type QueryDecomposition } from '@/types/agent';
import { safeJsonParse } from '@/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { URAS_DECOMPOSE_PROMPT } from '@/prompts/uras';
import type { ServiceMode } from '@/types/chat';
import { DocumentSearchService, type DocumentEvidence } from './document-search.service';
import { FAQSearchService, type FAQEvidence } from './faq-search.service';
import { isIndexed } from './qdrant.service';

export interface RetrievalEvidence {
  docs: DocumentEvidence[];
  faqs: FAQEvidence[];
}

export interface DecompositionWithRetrieval {
  decomposition: QueryDecomposition;
  evidence: RetrievalEvidence | null;
}

/**
 * Orchestrator Service that coordinates specialized agents in parallel.
 */
export class ManagerService {
  /**
   * Decomposes a user query using parallel specialists.
   */
  static async decompose(
    messages: { role: string; content: string }[],
    mode: ServiceMode = 'wiki'
  ): Promise<QueryDecomposition> {
    const history = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const decomposeRes = await PoeService.chat([
      { role: 'system', content: URAS_DECOMPOSE_PROMPT },
      ...history,
    ]);

    const decomposeContent = (decomposeRes as ChatCompletion).choices[0].message.content || '';
    console.log('[Decompose]', decomposeContent);

    const decomposeData = safeJsonParse<{ subQueries: string[]; reasoning: string; chitchat?: boolean }>(decomposeContent);

    const combined = {
      chitchat: decomposeData?.chitchat ?? false,
      subQueries: decomposeData?.subQueries ?? null,
      reasoning: decomposeData?.reasoning ?? 'Decomposed',
    } as Record<string, unknown>;

    const result = QueryDecompositionSchema.safeParse(combined);
    if (!result.success) {
      console.error('Decomposition Validation Error:', result.error);
      return {
        reasoning: String(combined.reasoning ?? 'Fallback'),
        subQueries: combined.subQueries as string[] | null,
      };
    }

    return result.data;
  }

  /**
   * Decomposes query AND retrieves relevant evidence from Qdrant (if indexed).
   * Falls back to evidence=null when the knowledge base hasn't been indexed yet.
   */
  static async decomposeWithRetrieval(
    messages: { role: string; content: string }[],
    mode: ServiceMode = 'wiki'
  ): Promise<DecompositionWithRetrieval> {
    // Run decomposition + index-check in parallel
    const [decomposition, indexed] = await Promise.all([
      ManagerService.decompose(messages, mode),
      isIndexed(mode).catch(() => false),
    ]);

    if (!indexed) {
      console.log(`[URASys] Collection "${mode}" not indexed — skipping retrieval, using fallback`);
      return { decomposition, evidence: null };
    }

    if (decomposition.chitchat) {
      console.log('[URASys] Chitchat detected — skipping retrieval');
      return { decomposition, evidence: null };
    }

    // Fan out retrieval across all sub-queries (Algorithm 1: foreach qi ∈ S)
    // Fall back to raw user message if decomposition produced no sub-queries
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const subQueries = (decomposition.subQueries && decomposition.subQueries.length > 0)
      ? decomposition.subQueries
      : (lastUserMsg.trim() ? [lastUserMsg] : null);

    if (!subQueries) {
      return { decomposition, evidence: null };
    }

    try {
      // Run dual retrieval in parallel for EACH sub-query, then union evidence pools
      const perQueryResults = await Promise.all(
        subQueries.map(qi => Promise.all([
          DocumentSearchService.search(qi, mode, 5).catch(() => [] as DocumentEvidence[]),
          FAQSearchService.search(qi, mode, 5).catch(() => [] as FAQEvidence[]),
        ]))
      );

      // Union and deduplicate by content
      const seenDocContents = new Set<string>();
      const seenFaqQuestions = new Set<string>();
      const docs: DocumentEvidence[] = [];
      const faqs: FAQEvidence[] = [];

      for (const [qDocs, qFaqs] of perQueryResults) {
        for (const d of qDocs) {
          if (!seenDocContents.has(d.content)) {
            seenDocContents.add(d.content);
            docs.push(d);
          }
        }
        for (const f of qFaqs) {
          if (!seenFaqQuestions.has(f.question)) {
            seenFaqQuestions.add(f.question);
            faqs.push(f);
          }
        }
      }

      // Sort by score descending and cap at top 5 each
      docs.sort((a, b) => b.score - a.score);
      faqs.sort((a, b) => b.score - a.score);

      return { decomposition, evidence: { docs: docs.slice(0, 5), faqs: faqs.slice(0, 5) } };
    } catch (err) {
      console.error('Retrieval failed, continuing without evidence:', err);
      return { decomposition, evidence: null };
    }
  }
}