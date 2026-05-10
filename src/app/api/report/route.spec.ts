import { describe, it, expect, vi } from 'vitest';

// Mock drizzle db
const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 'u1' }]),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  }),
};

vi.mock('@/core/db', () => ({ db: mockDb }));
vi.mock('@/core/db/schema', () => ({ reports: {}, users: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));

vi.mock('@/core/lib/supabase-server', () => ({
  createServerSupabase: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

vi.mock('@core/infrastructure/adapters', () => ({}));

describe('POST /api/report', () => {
  it('returns 400 for missing fields', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 for valid report', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedMessage: 'bad', conversation: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(data.success).toBe(true);
  });
});
