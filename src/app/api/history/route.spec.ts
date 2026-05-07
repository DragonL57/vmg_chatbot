import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

vi.mock('@core/infrastructure/adapters', () => {
  class MockAuthRepo { getInternalId = vi.fn().mockResolvedValue('internal-1'); }
  class MockChatRepo { listByUser = vi.fn().mockResolvedValue([{ id: 'conv1', title: 'Test' }]); }
  return {
    DrizzleAuthRepositoryAdapter: MockAuthRepo,
    DrizzleChatRepositoryAdapter: MockChatRepo,
    DrizzleKnowledgeRepositoryAdapter: class {},
    QdrantVectorStoreAdapter: class {}, LLMProviderAdapter: class {},
    ConsoleLoggerAdapter: class {}, DrizzleMemoryRepositoryAdapter: class {},
    DrizzleObservabilityAdapter: class {},
  };
});

vi.mock('@/core/db', () => ({ db: {} }));

describe('GET /api/history', () => {
  it('returns conversations for authenticated user', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
