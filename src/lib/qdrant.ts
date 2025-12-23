import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '@/env';

/**
 * Qdrant vector database client.
 * Configured with URL and API key from environment variables.
 */
export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

/**
 * Collection names for URASys.
 */
export const COLLECTIONS = {
  DOCUMENTS: 'documents',
  FAQS: 'faqs',
} as const;
