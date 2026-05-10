import { describe, it, expect, vi } from 'vitest';

vi.mock('../infrastructure/adapters/pageindex.adapter', () => ({
  searchAllFiles: vi.fn().mockResolvedValue({ passages: [], trace: '' }),
  buildAndStoreTree: vi.fn(),
  collectionUsesPageIndex: vi.fn().mockResolvedValue(false),
  getFileTree: vi.fn().mockResolvedValue(null),
}));

import { AgentState } from './state';
import {
  analyzeQueryNode, summarizeHistoryNode,
  retrieveNode, compressNode,
} from './nodes';

describe('ragGraph - node functions exist', () => {
  it('all 4 node functions are defined', () => {
    expect(typeof analyzeQueryNode).toBe('function');
    expect(typeof summarizeHistoryNode).toBe('function');
    expect(typeof retrieveNode).toBe('function');
    expect(typeof compressNode).toBe('function');
  });

  it('analyzeQueryNode has 2 parameters', () => {
    expect(analyzeQueryNode.length).toBe(2);
  });

  it('retrieveNode has 2 parameters', () => {
    expect(retrieveNode.length).toBe(2);
  });
});

describe('ragGraph - state structure', () => {
  it('AgentState has all fields needed by routing conditions', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('questionIsClear');
    expect(keys).toContain('isChitChat');
  });

  it('AgentState has all fields needed by retrieve node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('subQueries');
    expect(keys).toContain('messages');
    expect(keys).toContain('evidence');
  });

  it('AgentState has all fields needed by compress node', () => {
    const keys = Object.keys(AgentState.spec);
    expect(keys).toContain('context_summary');
    expect(keys).toContain('reflection');
  });
});
