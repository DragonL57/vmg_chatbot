import { describe, it, expect } from 'vitest';
import { AgentState } from './state';

describe('AgentState annotations', () => {
  it('has 16 state fields defined', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys.length).toBe(16);
  });

  it('has all required state fields', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('questionIsClear');
    expect(keys).toContain('rewrittenQuestions');
    expect(keys).toContain('messages');
    expect(keys).toContain('subQueries');
    expect(keys).toContain('evidence');
    expect(keys).toContain('iterations');
    expect(keys).toContain('isRelevant');
    expect(keys).toContain('context_summary');
    expect(keys).toContain('mode');
    expect(keys).toContain('targetCollections');
    expect(keys).toContain('allCollections');
    expect(keys).toContain('isChitChat');
    expect(keys).toContain('reflection');
    expect(keys).toContain('traceId');
    expect(keys).toContain('userMemories');
    expect(keys).toContain('totalUsage');
  });

  it('has routing fields needed by conditional edges', () => {
    const keys = Object.keys(AgentState.spec);
    // analyze_query → router_expand uses questionIsClear
    expect(keys).toContain('questionIsClear');
    // router_expand → retrieve/compress uses isChitChat
    expect(keys).toContain('isChitChat');
    // grade → rewrite/compress uses isRelevant + iterations
    expect(keys).toContain('isRelevant');
    expect(keys).toContain('iterations');
  });

  it('has retrieval fields needed by retrieve node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('subQueries');
    expect(keys).toContain('targetCollections');
    expect(keys).toContain('evidence');
  });

  it('has synthesis fields needed by compress node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('context_summary');
    expect(keys).toContain('reflection');
    expect(keys).toContain('isChitChat');
    expect(keys).toContain('isRelevant');
  });

  it('has observability fields', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('traceId');
    expect(keys).toContain('totalUsage');
  });
});
