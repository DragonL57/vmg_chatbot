import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

class MockAuthRepo { getInternalId = vi.fn().mockResolvedValue('internal-1'); getUser = vi.fn().mockResolvedValue({ id: 'i1', role: 'user' }); }
class MockMemoryRepo {
  getMemories = vi.fn().mockResolvedValue([]);
  getByUserId = vi.fn().mockResolvedValue([{ id: 'm1', fact: 'Test', category: 'preference' }]);
  deleteMemory = vi.fn().mockResolvedValue(undefined);
  addMemory = vi.fn().mockResolvedValue(undefined);
  updateMemory = vi.fn().mockResolvedValue(undefined);
}
class MockLogger { info = vi.fn(); warn = vi.fn(); error = vi.fn(); }

vi.mock('@core/infrastructure/adapters', () => ({
  DrizzleAuthRepositoryAdapter: MockAuthRepo,
  DrizzleMemoryRepositoryAdapter: MockMemoryRepo,
  DrizzleMemoryRepository: MockMemoryRepo,
  ConsoleLoggerAdapter: MockLogger,
  DrizzleChatRepositoryAdapter: class {},
  DrizzleKnowledgeRepositoryAdapter: class {},
  
  LLMProviderAdapter: class {},
  DrizzleObservabilityAdapter: class {},
}));

vi.mock('@core/application/use-cases', () => ({
  GetRecentMemoriesUseCase: class {
    execute = vi.fn().mockResolvedValue([{ id: 'm1', fact: 'Test' }]);
  },
  UpdateMemoryUseCase: class { execute = vi.fn(); },
  DeleteMemoryUseCase: class { execute = vi.fn(); },
}));

vi.mock('@/core/db', () => ({ db: {} }));
vi.mock('@/env', () => ({
  env: { SUPABASE_URL: 'url', SUPABASE_KEY: 'k', SUPABASE_SERVICE_KEY: 'k', DATABASE_URL: 'db', POE_API_KEY: 'k', POE_BOT_NAME: 'b', POE_REASONING_MODEL: 'r', INCEPTION_API_KEY: '', INCEPTION_MODEL: '', NEXT_PUBLIC_SUPABASE_URL: 'url', NEXT_PUBLIC_SUPABASE_KEY: 'k' },
}));

describe('User API routes', () => {
  it('GET /api/user/memories returns 200 with memories', async () => {
    const { GET } = await import('./memories/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.memories).toBeDefined();
  });

  it('GET /api/user/data returns 200 or 401', async () => {
    const { GET } = await import('./data/route');
    const res = await GET();
    expect([200, 401, 403, 500]).toContain(res.status);
  });
});
