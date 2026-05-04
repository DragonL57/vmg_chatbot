import { describe, it, expect } from 'vitest';
import { CHAT_POLICIES } from './chat';

describe('CHAT_POLICIES', () => {
  it('has CONTEXT_COMPACTION_THRESHOLD set to 6', () => {
    expect(CHAT_POLICIES.CONTEXT_COMPACTION_THRESHOLD).toBe(6);
  });

  it('has TOKEN_COMPRESSION_THRESHOLD set to 3000', () => {
    expect(CHAT_POLICIES.TOKEN_COMPRESSION_THRESHOLD).toBe(3000);
  });

  it('has MAX_HISTORY_MESSAGES set to 10', () => {
    expect(CHAT_POLICIES.MAX_HISTORY_MESSAGES).toBe(10);
  });

  it('has MAX_ITERATIONS set to 3', () => {
    expect(CHAT_POLICIES.MAX_ITERATIONS).toBe(3);
  });

  it('all values are positive numbers', () => {
    const values = Object.values(CHAT_POLICIES);
    for (const v of values) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
