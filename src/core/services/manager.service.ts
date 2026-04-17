import { PoeService } from './poe.service';
import { QueryDecompositionSchema, type QueryDecomposition } from '@core/types/agent';
import { safeJsonParse } from '@core/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { QUERY_ANALYSIS_PROMPT } from '@core/prompts/rag-agents';
import { VectorSearchService, type DocumentEvidence } from './vector-search.service';
import { isIndexed } from './qdrant.service';

export interface RetrievalEvidence {
  docs: DocumentEvidence[];
}

export interface QueryAnalysisWithRetrieval {
  analysis: QueryDecomposition;
  evidence: RetrievalEvidence | null;
}

/**
 * Core Orchestrator Service
 * Decomposes queries and coordinates high-precision retrieval agents.
 */
export class ManagerService {
  /**
   * Analyzes user intent and generates optimized search sub-queries.
   */
  static async decompose(
    messages: { role: string; content: string }[]
  ): Promise<QueryDecomposition> {
    const history = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const response = await PoeService.chat([
      { role: 'system', content: QUERY_ANALYSIS_PROMPT },
      ...history,
    ]);

    const content = (response as ChatCompletion).choices[0].message.content || '';
    const parsed = safeJsonParse<QueryDecomposition>(content);

    const result = QueryDecompositionSchema.safeParse({
      chitchat: parsed?.chitchat ?? false,
      subQueries: parsed?.subQueries ?? null,
      reasoning: parsed?.reasoning ?? 'Analyzed',
      is_clear: parsed?.is_clear ?? true,
      clarification_needed: parsed?.clarification_needed ?? null,
    });

    if (!result.success) {
      return {
        reasoning: 'Fallback analysis',
        subQueries: null,
        is_clear: true,
      };
    }

    return result.data;
  }

  static async analyzeWithRetrieval(
    messages: { role: string; content: string }[],
    mode: string
  ): Promise<QueryAnalysisWithRetrieval> {
    const [analysis, indexed] = await Promise.all([
      this.decompose(messages),
      isIndexed(mode).catch(() => false),
    ]);

    if (!indexed || analysis.chitchat || !analysis.is_clear) {
      return { analysis, evidence: null };
    }

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const queries = (analysis.subQueries && analysis.subQueries.length > 0)
      ? analysis.subQueries
      : (lastUserMsg.trim() ? [lastUserMsg] : []);

    if (queries.length === 0) {
      return { analysis, evidence: null };
    }

    try {
      const perQueryResults = await Promise.all(
        queries.map(q => VectorSearchService.search(q, mode, 5))
      );

      // Union and deduplicate
      const seen = new Set<string>();
      const docs: DocumentEvidence[] = [];

      for (const results of perQueryResults) {
        for (const doc of results) {
          if (!seen.has(doc.content)) {
            seen.add(doc.content);
            docs.push(doc);
          }
        }
      }

      docs.sort((a, b) => b.score - a.score);

      return { 
        analysis, 
        evidence: { docs: docs.slice(0, 6) } 
      };
    } catch (err) {
      console.error('[Manager] Retrieval error:', err);
      return { analysis, evidence: null };
    }
  }
}
