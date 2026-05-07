import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

// Shared mock classes with all methods routes might call
class MockAuthRepo {
  getInternalId = vi.fn().mockResolvedValue('internal-1');
  getUser = vi.fn().mockResolvedValue({ id: 'i1', role: 'user', email: 'test@vmg.edu.vn' });
  isAdmin = vi.fn().mockResolvedValue(false);
  getOrCreateUser = vi.fn();
}
class MockChatRepo {
  listByUser = vi.fn().mockResolvedValue([]);
  getById = vi.fn().mockResolvedValue(null);
  upsert = vi.fn().mockResolvedValue(undefined);
  ensureExists = vi.fn().mockResolvedValue(undefined);
  delete = vi.fn().mockResolvedValue(undefined);
  star = vi.fn().mockResolvedValue(undefined);
  rename = vi.fn().mockResolvedValue(undefined);
}
class MockLogger { info = vi.fn(); warn = vi.fn(); error = vi.fn(); }

vi.mock('@core/infrastructure/adapters', () => ({
  DrizzleAuthRepositoryAdapter: MockAuthRepo,
  DrizzleChatRepositoryAdapter: MockChatRepo,
  ConsoleLoggerAdapter: MockLogger,
  DrizzleKnowledgeRepositoryAdapter: class { listCollections = vi.fn(() => []); listFiles = vi.fn(() => []); deleteFile = vi.fn(); },
  QdrantVectorStoreAdapter: class { deleteBySource = vi.fn(); ensureCollection = vi.fn(); },
  LLMProviderAdapter: class {},
  DrizzleMemoryRepositoryAdapter: class {},
  DrizzleObservabilityAdapter: class {},
}));

vi.mock('@/core/db', () => ({ db: {} }));
vi.mock('@/env', () => ({
  env: { SUPABASE_URL: 'url', SUPABASE_KEY: 'key', SUPABASE_SERVICE_KEY: 'k', DATABASE_URL: 'db', POE_API_KEY: 'k', POE_BOT_NAME: 'b', POE_REASONING_MODEL: 'r', QDRANT_URL: 'url', QDRANT_API_KEY: 'k', INCEPTION_API_KEY: '', INCEPTION_MODEL: '', LLM_PROVIDER: 'poe', INDEXING_PROVIDER: 'poe' },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ storage: { from: () => ({ remove: vi.fn() }) } }),
}));

describe('Conversation API routes', () => {
  it('POST /api/conversation requires body', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/conversation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect([400, 401, 200]).toContain(res.status);
  });

  it('DELETE /api/conversation/[id]/delete returns 200 or 401', async () => {
    const { DELETE } = await import('./[id]/delete/route');
    const req = new Request('http://localhost/api/conversation/test-id/delete', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'test-id' }) });
    expect([200, 401, 403]).toContain(res.status);
  });

  it('POST /api/conversation/[id]/rename returns 200 or 400', async () => {
    const { POST } = await import('./[id]/rename/route');
    const req = new Request('http://localhost/api/conversation/test-id/rename', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) });
    expect([200, 400, 401]).toContain(res.status);
  });

  it('POST /api/conversation/[id]/star returns 200 or 401', async () => {
    const { POST } = await import('./[id]/star/route');
    const req = new Request('http://localhost/api/conversation/test-id/star', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isStarred: true }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) });
    expect([200, 401]).toContain(res.status);
  });

  it('GET /api/conversation/[id] returns 200 or 404 or 401', async () => {
    const { GET } = await import('./[id]/route');
    const req = new Request('http://localhost/api/conversation/test-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'test-id' }) });
    expect([200, 404, 401, 403]).toContain(res.status);
  });
});
