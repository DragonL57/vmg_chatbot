import { describe, it, expect } from 'vitest';
import { AgentState } from './state';

describe('AgentState annotations', () => {
  it('has 11 state fields defined', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys.length).toBe(11);
  });

  it('has all required state fields', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('questionIsClear');
    expect(keys).toContain('rewrittenQuestions');
    expect(keys).toContain('messages');
    expect(keys).toContain('subQueries');
    expect(keys).toContain('evidence');
    expect(keys).toContain('context_summary');
    expect(keys).toContain('isChitChat');
    expect(keys).toContain('reflection');
    expect(keys).toContain('traceId');
    expect(keys).toContain('userMemories');
    expect(keys).toContain('totalUsage');
  });

  it('has routing fields needed by conditional edges', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('questionIsClear');
    expect(keys).toContain('isChitChat');
  });

  it('has retrieval fields needed by retrieve node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('subQueries');
    expect(keys).toContain('evidence');
  });

  it('has synthesis fields needed by compress node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('context_summary');
    expect(keys).toContain('reflection');
    expect(keys).toContain('isChitChat');
  });

  it('has observability fields', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('traceId');
    expect(keys).toContain('totalUsage');
  });
});
