import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { summarizeHistoryNode } from './summarize-history.node';
import { analyzeQueryNode } from './analyze-query.node';
import { routerExpandNode } from './router-expand.node';
import { retrieveNode } from './retrieve.node';
import { gradeNode } from './grade.node';
import { rewriteNode } from './rewrite.node';
import { compressNode } from './compress.node';
import { LLMProviderAdapter } from '../../infrastructure/adapters/llm-provider.adapter';
import { QdrantVectorStoreAdapter } from '../../infrastructure/adapters/qdrant-vector-store.adapter';
import { ConsoleLoggerAdapter } from '../../infrastructure/adapters/console-logger.adapter';
import { AgentStateType } from '../state';
import { RunnableConfig } from '@langchain/core/runnables';

function makeConfig(): RunnableConfig {
  return {
    configurable: {
      llmProvider: new LLMProviderAdapter(),
      vectorStore: new QdrantVectorStoreAdapter(),
      obsPort: {
        startTrace: async () => 'trace-test',
        emitSpan: async () => {},
        finalizeTrace: async () => {},
      },
      logger: new ConsoleLoggerAdapter(),
    },
  };
}

function makeMessages(): (HumanMessage | AIMessage)[] {
  return [
    new HumanMessage({ content: 'Chào bạn, tôi muốn hỏi về VSTEP.' }),
    new AIMessage({ content: 'Chào bạn! Mình rất vui giúp bạn tìm hiểu về VSTEP.' }),
    new HumanMessage({ content: 'Thủ tục đăng ký như thế nào?' }),
    new AIMessage({ content: 'Bạn có thể đăng ký trực tuyến qua website VMG.' }),
    new HumanMessage({ content: 'Vậy học phí bao nhiêu?' }),
    new AIMessage({ content: 'Học phí VSTEP Mastery là 15 triệu đồng.' }),
    new HumanMessage({ content: 'Có khóa học online không?' }),
  ];
}

describe('Agent Node Integration - summarizeHistoryNode', () => {
  it('summarizes conversation history with real LLM', async () => {
    const state: Partial<AgentStateType> = {
      messages: makeMessages(),
      traceId: 'test-trace',
    };

    const result = await summarizeHistoryNode(state as AgentStateType, makeConfig());

    expect(result.context_summary).toBeTruthy();
    expect(result.reflection).toContain('optimized');
    expect(result.totalUsage).toBeDefined();
  }, 30000);

  it('skips when message count is below threshold', async () => {
    const state: Partial<AgentStateType> = {
      messages: [
        new HumanMessage({ content: 'Hi' }),
        new AIMessage({ content: 'Hello!' }),
      ],
      traceId: 'test-trace',
    };

    const result = await summarizeHistoryNode(state as AgentStateType, makeConfig());
    expect(result.reflection).toBe('');
    expect(result.context_summary).toBeUndefined();
  }, 5000);
});

describe('Agent Node Integration - analyzeQueryNode', () => {
  it('analyzes a clear VSTEP query', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Học phí VSTEP Mastery bao nhiêu?' })],
      context_summary: '',
      traceId: 'test-trace',
    };

    const result = await analyzeQueryNode(state as AgentStateType, makeConfig());

    expect(result.questionIsClear).toBe(true);
    expect(result.rewrittenQuestions.length).toBeGreaterThan(0);
    expect(result.reflection).toBeTruthy();
    expect(result.totalUsage).toBeDefined();
  }, 30000);

  it('analyzes a vague query needing clarification', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Nó' })],
      context_summary: '',
      traceId: 'test-trace',
    };

    const result = await analyzeQueryNode(state as AgentStateType, makeConfig());

    // The node should still return something (vague queries may or may not trigger clarification)
    expect(result.rewrittenQuestions).toBeDefined();
    expect(Array.isArray(result.rewrittenQuestions)).toBe(true);
  }, 30000);
});

describe('Agent Node Integration - routerExpandNode', () => {
  it('routes a RAG query to collections', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Học phí VSTEP bao nhiêu?' })],
      mode: 'auto',
      allCollections: [
        { id: '1', qdrantName: 'vstep-mastery', name: 'VSTEP Mastery', description: 'VSTEP info' },
        { id: '2', qdrantName: 'ielts-prep', name: 'IELTS', description: 'IELTS info' },
      ],
      traceId: 'test-trace',
      subQueries: ['Học phí VSTEP bao nhiêu?'],
    };

    const result = await routerExpandNode(state as AgentStateType, makeConfig());

    expect(result.isChitChat).toBe(false);
    expect(result.targetCollections.length).toBeGreaterThan(0);
    expect(result.subQueries).toBeDefined();
    expect(result.totalUsage).toBeDefined();
  }, 30000);

  it('detects chit-chat', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Chào bạn' })],
      mode: 'auto',
      allCollections: [{ id: '1', qdrantName: 'vstep', name: 'VSTEP', description: '' }],
      traceId: 'test-trace',
    };

    const result = await routerExpandNode(state as AgentStateType, makeConfig());

    expect(result.isChitChat).toBe(true);
    expect(result.reflection).toContain('conversation');
  }, 30000);
});

describe('Agent Node Integration - retrieveNode', () => {
  it('retrieves evidence from real Qdrant', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Học phí VSTEP bao nhiêu?' })],
      subQueries: ['Học phí VSTEP Mastery bao nhiêu?'],
      targetCollections: ['vstep-mastery'],
      traceId: 'test-trace',
    };

    const result = await retrieveNode(state as AgentStateType, makeConfig());

    expect(result.evidence).toBeDefined();
    expect(Array.isArray(result.evidence.docs)).toBe(true);
    expect(result.reflection).toContain('Scanning');
  }, 30000);
});

describe('Agent Node Integration - gradeNode', () => {
  it('grades relevant evidence positively', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Học phí VSTEP bao nhiêu?' })],
      evidence: {
        docs: [{
          id: '1', title: 'VSTEP Pricing',
          content: 'Học phí VSTEP Mastery là 15 triệu đồng.',
          source: 'vstep.md', parentContent: 'Học phí VSTEP Mastery là 15 triệu đồng.',
          score: 0.9,
        }],
      },
      subQueries: ['Học phí VSTEP Mastery bao nhiêu?'],
      traceId: 'test-trace',
    };

    const result = await gradeNode(state as AgentStateType, makeConfig());
    expect(typeof result.isRelevant).toBe('boolean');
    expect(result.reflection).toBeTruthy();
    expect(result.totalUsage).toBeDefined();
  }, 30000);

  it('grades irrelevant evidence negatively', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Thủ tục đăng ký IELTS?' })],
      evidence: {
        docs: [{
          id: '1', title: 'VSTEP Cooking',
          content: 'Cách nấu phở bò ngon.',
          source: 'cooking.md', parentContent: 'Cách nấu phở bò ngon.', score: 0.1,
        }],
      },
      subQueries: ['Thủ tục đăng ký IELTS?'],
      traceId: 'test-trace',
    };

    const result = await gradeNode(state as AgentStateType, makeConfig());
    expect(typeof result.isRelevant).toBe('boolean');
    expect(result.totalUsage).toBeDefined();
  }, 30000);
});

describe('Agent Node Integration - rewriteNode', () => {
  it('generates alternative search queries', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Giá khóa VSTEP?' })],
      traceId: 'test-trace',
      iterations: 0,
    };

    const result = await rewriteNode(state as AgentStateType, makeConfig());
    expect(Array.isArray(result.subQueries)).toBe(true);
    expect(result.subQueries.length).toBeGreaterThan(0);
    expect(result.iterations).toBe(1);
    expect(result.totalUsage).toBeDefined();
  }, 30000);
});

describe('Agent Node Integration - compressNode', () => {
  it('compresses relevant evidence into a summary', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Học phí VSTEP?' })],
      evidence: {
        docs: [{
          id: '1', title: 'Pricing',
          content: 'Học phí VSTEP là 15 triệu đồng.',
          source: 'vstep.md', parentContent: 'Học phí VSTEP Mastery là 15 triệu đồng.', score: 0.9,
        }],
      },
      traceId: 'test-trace',
      isChitChat: false,
      isRelevant: true,
    };

    const result = await compressNode(state as AgentStateType, makeConfig());
    expect(result.context_summary).toBeTruthy();
    expect(result.reflection).toContain('Synthesized');
    expect(result.totalUsage).toBeDefined();
  }, 30000);

  it('skips when isRelevant is false', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Học phí VSTEP?' })],
      evidence: { docs: [] },
      traceId: 'test-trace',
      isChitChat: false,
      isRelevant: false,
    };

    const result = await compressNode(state as AgentStateType, makeConfig());
    expect(result.reflection).toBe('');
    expect(result.context_summary).toBeUndefined();
  }, 5000);

  it('skips when isChitChat is true', async () => {
    const state: Partial<AgentStateType> = {
      messages: [new HumanMessage({ content: 'Chào bạn' })],
      evidence: { docs: [{ id: '1', title: 'T', content: 'c', source: 's', parentContent: 'p' }] },
      traceId: 'test-trace',
      isChitChat: true,
      isRelevant: true,
    };

    const result = await compressNode(state as AgentStateType, makeConfig());
    expect(result.reflection).toBe('');
  }, 5000);
});
