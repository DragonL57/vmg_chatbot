import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '@/env';

/**
 * Singleton Qdrant client connected to Qdrant Cloud.
 */
export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
  timeout: 60000, // 60 seconds
  checkCompatibility: false,
});

/** Qdrant server-side inference model (free, 384 dims, 100 languages) */
export const INFERENCE_MODEL = 'intfloat/multilingual-e5-small' as const;
export const EMBEDDING_DIM = 384;
