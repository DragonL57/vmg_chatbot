import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '@/env';

/**
 * Singleton Qdrant client connected to Qdrant Cloud.
 * Uses the full cluster URL directly as shown in the Qdrant Cloud quickstart.
 * checkCompatibility=false skips the version-ping that causes 404 on some hosted plans.
 */
export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
  checkCompatibility: false,
});

/**
 * Collection names per service mode.
 */
export const COLLECTIONS = {
  wiki: {
    documents: 'vmg_docs_wiki',
    faqs: 'vmg_faqs_wiki',
  },
  esl: {
    documents: 'vmg_docs_esl',
    faqs: 'vmg_faqs_esl',
  },
  'study-abroad': {
    documents: 'vmg_docs_study_abroad',
    faqs: 'vmg_faqs_study_abroad',
  },
} as const;

export type ServiceMode = keyof typeof COLLECTIONS;

/** Qdrant server-side inference model (free, 384 dims, 100 languages) */
export const INFERENCE_MODEL = 'intfloat/multilingual-e5-small' as const;
export const EMBEDDING_DIM = 384;
