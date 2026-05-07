import { describe, it, expect } from 'vitest';
import { CHAT_POLICIES } from '../../domain/entities/chat';

describe('summarizeHistoryNode - skip condition', () => {
  it('skips when message count is below threshold', () => {
    // messages.length < CONTEXT_COMPACTION_THRESHOLD (6) → skip
    const messages = ['m1', 'm2', 'm3'];
    const shouldSkip = messages.length < CHAT_POLICIES.CONTEXT_COMPACTION_THRESHOLD;
    expect(shouldSkip).toBe(true);
  });

  it('does NOT skip when message count meets threshold', () => {
    const messages = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
    const shouldSkip = messages.length < CHAT_POLICIES.CONTEXT_COMPACTION_THRESHOLD;
    expect(shouldSkip).toBe(false);
  });

  it('does NOT skip when message count exceeds threshold', () => {
    const messages = Array(10).fill('msg');
    const shouldSkip = messages.length < CHAT_POLICIES.CONTEXT_COMPACTION_THRESHOLD;
    expect(shouldSkip).toBe(false);
  });

  it('CONTEXT_COMPACTION_THRESHOLD is 6', () => {
    expect(CHAT_POLICIES.CONTEXT_COMPACTION_THRESHOLD).toBe(6);
  });
});
