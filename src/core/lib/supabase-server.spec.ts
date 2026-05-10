import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    NEXT_PUBLIC_SUPABASE_KEY: 'test-pub-key',
    INCEPTION_API_KEY: 'test',
    INCEPTION_MODEL: 'mercury-2',
    SUPABASE_KEY: 'test',
    DATABASE_URL: 'postgres://test',
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
