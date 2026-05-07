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

// Dynamic import after mock is hoisted
const { qdrantClient, INFERENCE_MODEL, EMBEDDING_DIM } = await import('./qdrant');

describe('qdrantClient', () => {
  it('creates a Qdrant client instance', () => {
    expect(qdrantClient).toBeDefined();
  });

  it('has valid inference model constant', () => {
    expect(INFERENCE_MODEL).toBe('intfloat/multilingual-e5-small');
  });

  it('has embedding dimension set to 384', () => {
    expect(EMBEDDING_DIM).toBe(384);
  });
});
