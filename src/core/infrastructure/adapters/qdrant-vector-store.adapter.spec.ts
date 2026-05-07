import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    QDRANT_URL: 'https://test.qdrant.io:6333',
    QDRANT_API_KEY: 'test-key',
    POE_API_KEY: 'test',
    POE_BOT_NAME: 'test',
    POE_REASONING_MODEL: 'test',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_KEY: 'test',
    SUPABASE_SERVICE_KEY: 'test',
    DATABASE_URL: 'postgres://test',
    INCEPTION_API_KEY: '',
    INCEPTION_MODEL: '',
    LLM_PROVIDER: 'poe',
    INDEXING_PROVIDER: 'poe',
  },
}));

import { QdrantVectorStoreAdapter } from './qdrant-vector-store.adapter';

describe('QdrantVectorStoreAdapter', () => {
  it('given env config, instantiates without error and is an instance of the adapter', () => {
    const adapter = new QdrantVectorStoreAdapter();
    expect(adapter).toBeInstanceOf(QdrantVectorStoreAdapter);
  });

  it('given env config, when calling isIndexed with an unknown collection, returns false', async () => {
    const adapter = new QdrantVectorStoreAdapter();
    const result = await adapter.isIndexed('__nonexistent_test_collection__');
    expect(result).toBe(false);
  });
});
