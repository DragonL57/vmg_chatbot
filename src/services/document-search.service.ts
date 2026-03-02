import { hybridDocumentSearch, type SearchResult } from './qdrant.service';
import { DOCUMENT_SEARCH_AGENT_PROMPT } from '@/prompts/uras';
import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import type { ServiceMode } from '@/lib/qdrant';

export interface DocumentEvidence {
  title: string;
  content: string;
  source: string;
  score: number;
}

const MAX_RETRIES = 3;
const MIN_SCORE = 0.3;

/**
 * Document Search Agent — implements the iterative search loop from the URASys paper (Figure 8).
 * Uses an LLM to reformulate queries when initial results are inadequate.
 */
export class DocumentSearchService {
  /**
   * Iterative search with LLM-driven query reformulation.
   * Mirrors Algorithm 1 / Figure 8 from the URASys paper.
   */
  static async search(
    originalQuery: string,
    mode: ServiceMode,
    topK = 5
  ): Promise<DocumentEvidence[]> {
    const systemPrompt = DOCUMENT_SEARCH_AGENT_PROMPT(MAX_RETRIES);
    const queriesAttempted = new Set<string>();
    let bestResults: SearchResult[] = [];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // On first attempt use the original query; subsequent attempts ask LLM to reformulate
      let searchQuery = originalQuery;

      if (attempt > 1) {
        searchQuery = await this.reformulateWithLLM(
          originalQuery,
          Array.from(queriesAttempted),
          attempt,
          systemPrompt
        );
      }

      if (queriesAttempted.has(searchQuery)) continue;
      queriesAttempted.add(searchQuery);

      console.log(`[DocSearch] Attempt ${attempt}/${MAX_RETRIES} query="${searchQuery.slice(0, 70)}"`);
      const results = await hybridDocumentSearch(searchQuery, mode, topK).catch(() => [] as SearchResult[]);

      if (results.length > 0 && results[0].score > (bestResults[0]?.score ?? 0)) {
        bestResults = results;
      }

      const adequate = results.some(r => r.score >= MIN_SCORE);
      if (adequate) {
        console.log(`[DocSearch] ✓ Adequate results at attempt ${attempt} (best score: ${results[0]?.score.toFixed(3)})`);
        break;
      }
      console.log(`[DocSearch] ✗ Insufficient at attempt ${attempt}, best score: ${results[0]?.score.toFixed(3) ?? 'n/a'}`);
    }

    const final = bestResults
      .filter(r => r.score >= MIN_SCORE * 0.5)
      .map(r => ({
        title: String(r.payload.title ?? ''),
        content: String(r.payload.content ?? ''),
        source: String(r.payload.source ?? ''),
        score: r.score,
      }));
    console.log(`[DocSearch] Returning ${final.length} docs to manager`);
    return final;
  }

  /**
   * Uses the Document Search Agent LLM prompt to generate a reformulated query.
   */
  private static async reformulateWithLLM(
    originalQuery: string,
    previousQueries: string[],
    attempt: number,
    systemPrompt: string
  ): Promise<string> {
    try {
      const res = await poe.chat.completions.create({
        model: DEFAULT_POE_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Câu hỏi gốc: ${originalQuery}\n\nCác truy vấn đã thử: ${previousQueries.join(', ')}\n\nĐây là lần thử thứ ${attempt}. Hãy tạo một truy vấn tìm kiếm MỚI và KHÁC BIỆT bằng tiếng Việt. CHỈ trả về chuỗi truy vấn, không giải thích.`,
          },
        ],
      });
      const reformulated = (res.choices[0].message.content ?? '').trim();
      return reformulated || originalQuery;
    } catch {
      // Fallback to simple reformulation
      return this.simpleReformulate(originalQuery, attempt);
    }
  }

  private static simpleReformulate(query: string, attempt: number): string {
    if (attempt === 2) {
      return query
        .replace(/^(bạn có thể|cho tôi biết|tôi muốn biết|hỏi về|what is|what are|how|why|when|where)\s*/i, '')
        .trim();
    }
    return query.split(/\s+/).filter(w => w.length > 3).slice(0, 5).join(' ');
  }
}

