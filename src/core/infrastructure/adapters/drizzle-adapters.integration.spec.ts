import { describe, it, expect } from 'vitest';
import { DrizzleAuthRepositoryAdapter } from './drizzle-auth-repository.adapter';
import { DrizzleKnowledgeRepositoryAdapter } from './drizzle-knowledge-repository.adapter';
import { DrizzleChatRepositoryAdapter } from './drizzle-chat-repository.adapter';

const TEST_PREFIX = 'vitest_';

describe('DrizzleAuthRepositoryAdapter - real DB', () => {
  const repo = new DrizzleAuthRepositoryAdapter();

  it('getUser returns null for non-existent user', async () => {
    const user = await repo.getUser('00000000-0000-0000-0000-000000000000');
    expect(user).toBeNull();
  });

  it('getOrCreateUser creates and retrieves a test user', async () => {
    const testUuid = crypto.randomUUID();
    const user = await repo.getOrCreateUser({
      supabaseId: testUuid,
      email: `${TEST_PREFIX}${Date.now()}@vmg.edu.vn`,
      fullName: 'Vitest User',
    });

    expect(user).toBeDefined();
    expect(user.supabaseId).toBe(testUuid);
    expect(user.fullName).toBe('Vitest User');

    // Should return same user on second call
    const user2 = await repo.getOrCreateUser({
      supabaseId: testUuid,
      email: `${TEST_PREFIX}${Date.now()}@vmg.edu.vn`,
    });
    expect(user2.id).toBe(user.id);
  });

  it('isAdmin returns false for non-admin user', async () => {
    const testUuid = crypto.randomUUID();
    const user = await repo.getOrCreateUser({
      supabaseId: testUuid,
      email: `${TEST_PREFIX}${Date.now()}_na@vmg.edu.vn`,
    });
    expect(await repo.isAdmin(user.id)).toBe(false);
  });
});

describe('DrizzleKnowledgeRepositoryAdapter - real DB', () => {
  const repo = new DrizzleKnowledgeRepositoryAdapter();

  it('listFiles returns an array', async () => {
    const files = await repo.listFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it('listCollections returns an array', async () => {
    const collections = await repo.listCollections();
    expect(Array.isArray(collections)).toBe(true);
  });
});

describe('DrizzleChatRepositoryAdapter - real DB', () => {
  const repo = new DrizzleChatRepositoryAdapter();

  it('getById returns null for non-existent conversation', async () => {
    const conv = await repo.getById('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
    expect(conv).toBeNull();
  });

  it('listByUser returns an array', async () => {
    const convs = await repo.listByUser('00000000-0000-0000-0000-000000000000');
    expect(Array.isArray(convs)).toBe(true);
  });
});
