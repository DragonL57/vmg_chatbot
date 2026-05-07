import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

vi.mock('@core/infrastructure/adapters', () => {
  class MockKnowledgeRepo {
    listCollections = vi.fn().mockResolvedValue([{ id: '1', name: 'Test', qdrantName: 'test', description: 'desc' }]);
  }
  class MockAuthRepo { getInternalId = vi.fn().mockResolvedValue('internal-1'); }
  return {
    DrizzleKnowledgeRepositoryAdapter: MockKnowledgeRepo,
    DrizzleAuthRepositoryAdapter: MockAuthRepo,
    DrizzleChatRepositoryAdapter: class {},
    QdrantVectorStoreAdapter: class {},
    LLMProviderAdapter: class {},
    ConsoleLoggerAdapter: class {},
    DrizzleMemoryRepositoryAdapter: class {},
    DrizzleObservabilityAdapter: class {},
  };
});

vi.mock('@/core/db', () => ({ db: {} }));

describe('GET /api/collections', () => {
  it('returns collections for authenticated user', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.collections).toBeDefined();
  });
});
