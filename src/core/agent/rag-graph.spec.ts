import { describe, it, expect } from 'vitest';
import { AgentState } from './state';
import {
  analyzeQueryNode, routerExpandNode, summarizeHistoryNode,
  retrieveNode, gradeNode, rewriteNode, compressNode,
} from './nodes';

describe('ragGraph - node functions exist', () => {
  it('all 7 node functions are defined', () => {
    expect(typeof analyzeQueryNode).toBe('function');
    expect(typeof routerExpandNode).toBe('function');
    expect(typeof summarizeHistoryNode).toBe('function');
    expect(typeof retrieveNode).toBe('function');
    expect(typeof gradeNode).toBe('function');
    expect(typeof rewriteNode).toBe('function');
    expect(typeof compressNode).toBe('function');
  });

  it('analyzeQueryNode has 2 parameters', () => {
    expect(analyzeQueryNode.length).toBe(2);
  });

  it('retrieveNode has 2 parameters', () => {
    expect(retrieveNode.length).toBe(2);
  });

  it('gradeNode has 2 parameters', () => {
    expect(gradeNode.length).toBe(2);
  });
});

describe('ragGraph - state structure', () => {
  it('AgentState has all fields needed by routing conditions', () => {
    const keys = Object.keys(AgentState.spec);
    // Conditional edges use: questionIsClear, isChitChat, isRelevant, iterations
    expect(keys).toContain('questionIsClear');
    expect(keys).toContain('isChitChat');
    expect(keys).toContain('isRelevant');
    expect(keys).toContain('iterations');
  });

  it('AgentState has all fields needed by retrieve node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('subQueries');
    expect(keys).toContain('targetCollections');
    expect(keys).toContain('messages');
    expect(keys).toContain('evidence');
  });

  it('AgentState has all fields needed by compress node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('context_summary');
    expect(keys).toContain('reflection');
  });
});
