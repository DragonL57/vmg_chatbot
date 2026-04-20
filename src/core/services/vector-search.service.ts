import { hybridDocumentSearch, type SearchResult } from './qdrant.service';

export interface DocumentEvidence {
  title: string;
  content: string;
  source: string;
  score: number;
  collection: string;
  parentContent?: string;
}

const MIN_SCORE = 0.45; // Increased to filter noise in Parallel Retrieval mode

/**
 * Enterprise Vector Search Service
 * Handles hybrid retrieval. Reformulation is handled upstream by the LangGraph.
 */
export class VectorSearchService {
  /**
   * Search for relevant documents.
   */
  static async search(
    query: string,
    mode: string,
    topK = 5
  ): Promise<DocumentEvidence[]> {
    const searchQuery = this.cleanQuery(query);

    if (!searchQuery) return [];

    console.log(`[VectorSearch] Searching in "${mode}": "${searchQuery.slice(0, 70)}"`);
    const results = await hybridDocumentSearch(searchQuery, mode, topK).catch((err) => {
      console.error(`[VectorSearch] Qdrant Error in ${mode}:`, err.message);
      return [] as SearchResult[];
    });

    console.log(`[VectorSearch] "${mode}" Raw Results Count: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`  [Hit ${i + 1}] Score: ${r.score.toFixed(4)} | Title: ${r.payload.title}`);
      if (r.score < MIN_SCORE) {
        console.log(`    ⚠️  FILTERED: Score ${r.score.toFixed(4)} < MIN_SCORE ${MIN_SCORE}`);
      }
    });

    const filtered = results.filter(r => r.score >= MIN_SCORE);
    console.log(`[VectorSearch] "${mode}" After Filtering: ${filtered.length} docs`);

    return filtered.map(r => ({
      title: String(r.payload.title ?? ''),
      content: String(r.payload.content ?? ''),
      source: String(r.payload.source ?? ''),
      score: r.score,
      collection: mode,
      parentContent: String(r.payload.parentContent ?? ''),
    }));
  }

  /**
   * Aggressively strips LLM artifacts and hallucinations.
   */
  private static cleanQuery(q: string): string {
    return q
      .replace(/\*\*.*?\*\*/g, '') // Remove bold
      .replace(/Truy vấn \d+:/gi, '')
      .replace(/Tìm kiếm:/gi, '')
      .replace(/["“”'‘’`]/g, '')
      .replace(/^- /, '')
      .replace(/\(.*?\)/g, '') // Remove parenthetical explanations
      .split('\n')[0] // Only take the first line if LLM gave multiple
      .trim();
  }
}
