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

describe('QdrantVectorStoreAdapter - constructor and interface', () => {
  it('instantiates correctly', () => {
    const adapter = new QdrantVectorStoreAdapter();
    expect(adapter).toBeDefined();
    expect(typeof adapter.search).toBe('function');
    expect(typeof adapter.keywordSearch).toBe('function');
    expect(typeof adapter.listBySource).toBe('function');
    expect(typeof adapter.deleteBySource).toBe('function');
    expect(typeof adapter.ensureCollection).toBe('function');
    expect(typeof adapter.upsert).toBe('function');
    expect(typeof adapter.isIndexed).toBe('function');
  });

  it('implements all IVectorStorePort methods', () => {
    const adapter = new QdrantVectorStoreAdapter();
    const methods = ['ensureCollection', 'upsert', 'search', 'keywordSearch', 'listBySource', 'deleteBySource', 'isIndexed'];
    for (const m of methods) {
      expect(typeof (adapter as Record<string, unknown>)[m]).toBe('function');
    }
  });
});
