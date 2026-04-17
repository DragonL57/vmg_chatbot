import { denseSearch, type SearchResult } from './qdrant.service';
import { getFastProvider } from '@core/lib/providers';

export interface KnowledgeEvidence {
  id: string;
  title: string;
  content: string;
  score: number;
  source: string;
}

/**
 * Service for searching structured knowledge segments.
 */
export class KnowledgeSearchService {
  static async search(
    query: string,
    mode: string,
    topK = 5
  ): Promise<KnowledgeEvidence[]> {
    // This service can be used for searching structured data if needed in the future.
    // Currently, VectorSearchService handles the primary hierarchical document search.
    return [];
  }
}
