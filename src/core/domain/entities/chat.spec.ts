import { describe, it, expect } from 'vitest';
import { CHAT_POLICIES } from './chat';

describe('CHAT_POLICIES', () => {
  it('given chat policies, all thresholds are positive integers', () => {
    const values = Object.values(CHAT_POLICIES);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
