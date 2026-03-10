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
 * dev     → collections prefixed with "dev_"  (safe sandbox)
 * staging → collections prefixed with "stg_"  (test/preview)
 * prod    → no prefix (live collections)
 * Controlled by QDRANT_ENV env var.
 */
function getPrefix() {
  const envType = env.QDRANT_ENV;
  if (envType === 'prod') return '';
  if (envType === 'staging') return 'stg_';
  return 'dev_';
}

const ENV_PREFIX = getPrefix();

/**
 * Collection names per service mode.
 */
export const COLLECTIONS = {
  wiki: {
    documents: `${ENV_PREFIX}vmg_docs_wiki`,
    faqs: `${ENV_PREFIX}vmg_faqs_wiki`,
  },
} as const;

export type ServiceMode = keyof typeof COLLECTIONS;

/** Qdrant server-side inference model (free, 384 dims, 100 languages) */
export const INFERENCE_MODEL = 'intfloat/multilingual-e5-small' as const;
export const EMBEDDING_DIM = 384;
