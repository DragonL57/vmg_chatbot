import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/core/db';

// ── Module mocks ──────────────────────────────────────────────────────────
// Use the exact import strings from the route file so vi.mock matches.

const mockGetUser = vi.fn();
const mockGetInternalId = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: () => ({
    auth: { getUser: mockGetUser },
  }),
  createAdminSupabase: () => ({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  }),
}));

vi.mock('@/core/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockWhere })) })),
    delete: vi.fn(() => ({ where: mockWhere })),
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
        delete: vi.fn(() => ({ where: vi.fn() })),
      };
      await cb(tx);
    }),
  },
}));

vi.mock('@/core/db/schema', () => ({
  users: 'users',
  conversations: 'conversations',
  userMemories: 'userMemories',
  agentTraces: 'agentTraces',
  agentSpans: 'agentSpans',
  reports: 'reports',
}));

vi.mock('drizzle-orm', () => ({ eq: (a: unknown) => a, inArray: (a: unknown) => a }));

// Mock the adapters module — match the exact import path from route.ts
vi.mock('@core/infrastructure/adapters', () => ({
  DrizzleAuthRepositoryAdapter: vi.fn(function () {
    return { getInternalId: mockGetInternalId };
  }),
  ConsoleLoggerAdapter: vi.fn(function () {
    return { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  }),
}));

// Helpers ───────────────────────────────────────────────────────────────────

function mockAuth(user: { id: string; email: string } | null) {
  mockGetUser.mockResolvedValue({ data: { user } });
}

function mockInternalUser(id: string | null) {
  mockGetInternalId.mockResolvedValue(id);
}

function makeQuery(rows: unknown[]) {
  return {
    then: (resolve: (v: unknown) => void) => { resolve(rows); },
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function selectReturns(rows: unknown[]) {
  mockFrom.mockReturnValue({ where: vi.fn(() => makeQuery(rows)) });
}

async function loadRoute() {
  return await import('./route');
}

// Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/user/data — export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ id: 'supabase-1', email: 'test@vmg.edu.vn' });
    mockInternalUser('internal-1');
    selectReturns([]);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth(null);
    const { GET } = await loadRoute();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 404 when internal user not found', async () => {
    mockInternalUser(null);
    const { GET } = await loadRoute();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'User not found' });
  });

  it('returns expected export shape on success', async () => {
    const now = new Date('2026-05-04');
    // First select is for the internal user profile — needs .where().limit() chain
    mockFrom.mockReturnValueOnce({
      where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 'internal-1', email: 'test@vmg.edu.vn', fullName: 'Test User' }]) })),
    });
    selectReturns([{ id: 'conv-1', title: 'Test', messages: [], messageCount: 0, tokenUsage: null, createdAt: now, updatedAt: now }]);
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([{ id: 'mem-1', fact: 'likes coffee', category: 'preference', createdAt: now }]) });
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([{ id: 'trace-1', totalTokens: 100, totalCostUsd: '0.002', latencyMs: 500, feedback: 1, error: null, createdAt: now }]) });
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([{ id: 'report-1', reportedMessage: 'bad', note: 'review', createdAt: now }]) });

    const { GET } = await loadRoute();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('exportedAt');
    expect(body.userId).toBe('internal-1');
    // Profile now comes from internal users table, not Supabase Auth
    expect(body.profile).toMatchObject({ id: 'internal-1', email: 'test@vmg.edu.vn', fullName: 'Test User' });
    expect(body.conversations).toHaveLength(1);
    expect(body.memories).toHaveLength(1);
    expect(body.agentTraces).toHaveLength(1);
    expect(body.reports).toHaveLength(1);
  });

  it('returns sanitized 500 on server error', async () => {
    mockFrom.mockReturnValue({ where: vi.fn().mockRejectedValue(new Error('DB oops')) });
    const { GET } = await loadRoute();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Export failed' });
  });
});

describe('DELETE /api/user/data — anonymize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ id: 'supabase-1', email: 'test@vmg.edu.vn' });
    mockInternalUser('internal-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth(null);
    const { DELETE } = await loadRoute();
    const res = await DELETE();
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 404 when internal user not found', async () => {
    mockInternalUser(null);
    const { DELETE } = await loadRoute();
    const res = await DELETE();
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'User not found' });
  });

  it('anonymizes data and returns success', async () => {
    const { DELETE } = await loadRoute();
    const res = await DELETE();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, message: 'Dữ liệu đã được ẩn danh hóa' });
  });

  it('returns sanitized 500 on server error', async () => {
    // Override the transaction mock to make it reject
    vi.mocked(db.transaction).mockRejectedValueOnce(new Error('Internal error'));
    const { DELETE } = await loadRoute();
    const res = await DELETE();
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Anonymization failed' });
  });
});
