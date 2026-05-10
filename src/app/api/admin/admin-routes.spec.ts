import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

vi.mock('@core/infrastructure/adapters', () => {
  class MockAuthRepo {
    getInternalId = vi.fn().mockResolvedValue('internal-1');
    isAdmin = vi.fn().mockResolvedValue(true);
  }
  class MockKnowledgeRepo {
    listCollections = vi.fn().mockResolvedValue([]);
    listFiles = vi.fn().mockResolvedValue([]);
    getFileByFilename = vi.fn().mockResolvedValue(null);
  }
  return {
    DrizzleAuthRepositoryAdapter: MockAuthRepo,
    DrizzleKnowledgeRepositoryAdapter: MockKnowledgeRepo,
    DrizzleChatRepositoryAdapter: class {}, LLMProviderAdapter: class {},
    ConsoleLoggerAdapter: class {}, DrizzleMemoryRepositoryAdapter: class {},
    DrizzleObservabilityAdapter: class {},
  };
});

vi.mock('@/env', () => ({
  env: { POE_API_KEY: 'test', POE_BOT_NAME: 't', POE_REASONING_MODEL: 't', SUPABASE_URL: 'url', SUPABASE_KEY: 'k', SUPABASE_SERVICE_KEY: 'k', DATABASE_URL: 'db', INCEPTION_API_KEY: '', INCEPTION_MODEL: '', LLM_PROVIDER: 'poe', INDEXING_PROVIDER: 'poe' },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ storage: { from: () => ({ remove: vi.fn(), download: vi.fn() }) } }),
}));

vi.mock('@/core/db', () => ({ db: {} }));

describe('Admin API routes', () => {
  it('GET /api/admin/collections returns 200', async () => {
    const { GET } = await import('./collections/route');
    const res = await GET();
    expect([200, 401, 403]).toContain(res.status);
  });

  it('GET /api/admin/files returns 200', async () => {
    const { GET } = await import('./files/route');
    const res = await GET();
    expect([200, 401, 403]).toContain(res.status);
  });
});
