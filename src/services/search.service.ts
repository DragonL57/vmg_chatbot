import { qdrant, COLLECTIONS } from '@/lib/qdrant';
import { EmbeddingService } from '@/services/embedding.service';
import { SearchResult } from '@/types/agent';
import { ServiceMode } from '@/types/chat';

/**
 * Service for searching the Qdrant vector database.
 */
export class SearchService {
  /**
   * Searches the Document collection using semantic search.
   * 
   * @param query - The user's query or sub-query.
   * @param limit - Max number of results to return (default: 5).
   * @param mode - The service mode to filter by.
   */
  static async searchDocuments(query: string, limit: number = 5, mode: ServiceMode = 'esl'): Promise<SearchResult[]> {
    try {
      // 1. Generate embedding for the query
      const vector = await EmbeddingService.embed(query);

      if (!vector) {
        return [];
      }

      // 2. Perform vector search in Qdrant with filtering
      const filter = mode === 'study-abroad' 
        ? { must: [{ key: 'source', match: { value: 'study-abroad-overview.md' } }] }
        : { must_not: [{ key: 'source', match: { value: 'study-abroad-overview.md' } }] };

      const results = await qdrant.search(COLLECTIONS.DOCUMENTS, {
        vector,
        limit,
        filter,
        with_payload: true,
      });

      // 3. Map to SearchResult type
      return results.map((point) => ({
        content: (point.payload?.content as string) || '',
        source: (point.payload?.source as string) || 'Unknown Document',
        score: point.score,
        metadata: point.payload ?? undefined,
      }));
    } catch (error) {
      console.error(`Error searching documents for query "${query}":`, error);
      // Fallback: return empty array rather than crashing the agent
      return [];
    }
  }

  /**
   * Searches the FAQ collection using semantic search.
   * 
   * @param query - The user's query.
   * @param limit - Max number of results to return (default: 3).
   * @param mode - The service mode to filter by.
   */
  static async searchFaqs(query: string, limit: number = 3, mode: ServiceMode = 'esl'): Promise<SearchResult[]> {
    try {
      // 1. Generate embedding for the query
      const vector = await EmbeddingService.embed(query);

      if (!vector) {
        return [];
      }

      // Filter FAQs by source as well
      const filter = mode === 'study-abroad' 
        ? { must: [{ key: 'source', match: { value: 'study-abroad-overview.md' } }] }
        : { must_not: [{ key: 'source', match: { value: 'study-abroad-overview.md' } }] };

      const results = await qdrant.search(COLLECTIONS.FAQS, {
        vector,
        limit,
        filter,
        with_payload: true,
      });

      return results.map((point) => ({
        content: `Q: ${point.payload?.question}\nA: ${point.payload?.answer}`,
        source: 'FAQ Bank',
        score: point.score,
        metadata: point.payload ?? undefined,
      }));
    } catch (error) {
      console.error(`Error searching FAQs for query "${query}":`, error);
      return [];
    }
  }
}
