import { describe, it, expect } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { ragGraph } from './rag-graph';
import { LLMProviderAdapter } from '../infrastructure/adapters/llm-provider.adapter';
import { QdrantVectorStoreAdapter } from '../infrastructure/adapters/qdrant-vector-store.adapter';
import { ConsoleLoggerAdapter } from '../infrastructure/adapters/console-logger.adapter';

describe('ragGraph - end-to-end with real services', () => {
  it('processes a simple RAG query end-to-end', async () => {
    const result = await ragGraph.invoke(
      {
        messages: [new HumanMessage({ content: 'Học phí VSTEP Mastery bao nhiêu?' })],
        mode: 'auto',
        allCollections: [
          { id: '1', qdrantName: 'vstep-mastery', name: 'VSTEP Mastery', description: 'VSTEP program info' },
        ],
        traceId: null,
      },
      {
        configurable: {
          llmProvider: new LLMProviderAdapter(),
          vectorStore: new QdrantVectorStoreAdapter(),
          obsPort: {
            startTrace: async () => 'trace-e2e',
            emitSpan: async () => {},
            finalizeTrace: async () => {},
          },
          logger: new ConsoleLoggerAdapter(),
        },
      }
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.totalUsage).toBeDefined();
  }, 120000);

  it('processes a chit-chat query end-to-end', async () => {
    const result = await ragGraph.invoke(
      {
        messages: [new HumanMessage({ content: 'Chào bạn!' })],
        mode: 'auto',
        allCollections: [
          { id: '1', qdrantName: 'vstep-mastery', name: 'VSTEP Mastery', description: 'VSTEP program info' },
        ],
        traceId: null,
      },
      {
        configurable: {
          llmProvider: new LLMProviderAdapter(),
          vectorStore: new QdrantVectorStoreAdapter(),
          obsPort: {
            startTrace: async () => 'trace-e2e',
            emitSpan: async () => {},
            finalizeTrace: async () => {},
          },
          logger: new ConsoleLoggerAdapter(),
        },
      }
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.totalUsage).toBeDefined();
  }, 120000);
});
