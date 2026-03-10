import { faqSearch, type SearchResult } from './qdrant.service';
import { FAQ_SEARCH_AGENT_PROMPT } from '@core/prompts/uras';
import { getFastProvider } from '@core/lib/providers';
import type { ServiceMode } from '@core/lib/qdrant';

export interface FAQEvidence {
  question: string;
  answer: string;
  score: number;
}

const MAX_RETRIES = 3;
const MIN_SCORE = 0.6; // FAQs are exact-match style — higher threshold

/**
 * FAQ Search Agent — implements the iterative search loop from the URASys paper (Figure 9).
 * Uses an LLM to reformulate queries when FAQ matches are below threshold.
 */
export class FAQSearchService {
  /**
   * Iterative dense FAQ search with LLM-driven query reformulation.
   */
  static async search(
    originalQuery: string,
    mode: ServiceMode,
    topK = 5
  ): Promise<FAQEvidence[]> {
    const systemPrompt = FAQ_SEARCH_AGENT_PROMPT(MAX_RETRIES);
    const queriesAttempted = new Set<string>();
    let bestResults: SearchResult[] = [];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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

      console.log(`[FAQSearch] Attempt ${attempt}/${MAX_RETRIES} query="${searchQuery.slice(0, 70)}"`);
      const results = await faqSearch(searchQuery, mode, topK).catch(() => [] as SearchResult[]);

      if (results.length > 0 && (results[0]?.score ?? 0) > (bestResults[0]?.score ?? 0)) {
        bestResults = results;
      }

      const hasGoodMatch = results.some(r => r.score >= MIN_SCORE);
      if (hasGoodMatch) {
        console.log(`[FAQSearch] ✓ Good match at attempt ${attempt} (best score: ${results[0]?.score.toFixed(3)})`);
        break;
      }
      console.log(`[FAQSearch] ✗ Below threshold at attempt ${attempt}, best score: ${results[0]?.score.toFixed(3) ?? 'n/a'}`);
    }

    const final = bestResults
      .filter(r => r.score >= MIN_SCORE * 0.7)
      .map(r => ({
        question: String(r.payload.question ?? ''),
        answer: String(r.payload.answer ?? ''),
        score: r.score,
      }));
    console.log(`[FAQSearch] Returning ${final.length} FAQs to manager`);
    return final;
  }

  /**
   * Uses the FAQ Search Agent LLM prompt to generate a reformulated Vietnamese query.
   */
  private static async reformulateWithLLM(
    originalQuery: string,
    previousQueries: string[],
    attempt: number,
    systemPrompt: string
  ): Promise<string> {
    try {
      const { client, model, extraBody } = getFastProvider();
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Câu hỏi gốc: ${originalQuery}\n\nCác truy vấn đã thử: ${previousQueries.join(', ')}\n\nĐây là lần thử thứ ${attempt}. Hãy tạo một truy vấn FAQ MỚI và KHÁC BIỆT bằng tiếng Việt. CHỈ trả về chuỗi truy vấn, không giải thích.`,
          },
        ],
        ...(extraBody ? { extra_body: extraBody } : {}),
      } as Parameters<typeof client.chat.completions.create>[0]) as Awaited<ReturnType<typeof client.chat.completions.create>> & { choices: { message: { content: string | null } }[] };
      const reformulated = (res.choices[0].message.content ?? '').trim();
      return reformulated || originalQuery;
    } catch {
      return this.simpleReformulate(originalQuery, attempt);
    }
  }

  private static simpleReformulate(query: string, attempt: number): string {
    if (attempt === 2) {
      return query.replace(/[?!.]/g, '').trim();
    }
    return query.split(/\s+/).slice(0, 6).join(' ');
  }
}


