import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    NEXT_PUBLIC_SUPABASE_KEY: 'test-pub-key',
    POE_API_KEY: 'test',
    POE_BOT_NAME: 'test',
    POE_REASONING_MODEL: 'test',
    QDRANT_URL: 'https://test.qdrant.io:6333',
    QDRANT_API_KEY: 'test',
    SUPABASE_KEY: 'test',
    DATABASE_URL: 'postgres://test',
    INCEPTION_API_KEY: '',
    INCEPTION_MODEL: '',
    LLM_PROVIDER: 'poe',
    INDEXING_PROVIDER: 'poe',
  },
}));

import { createAdminSupabase, createServerSupabase } from './supabase-server';

describe('createAdminSupabase', () => {
  it('creates an admin Supabase client', () => {
    const client = createAdminSupabase();
    expect(client).toBeDefined();
    expect(typeof client.auth.getUser).toBe('function');
  });
});

// createServerSupabase needs Next.js cookies() — skip in vitest
describe('createServerSupabase - export check', () => {
  it('is a function', () => {
    expect(typeof createServerSupabase).toBe('function');
  });
});
