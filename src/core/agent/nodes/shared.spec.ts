import { describe, it, expect, vi } from 'vitest';
import { getConfig, logPayload, safeParseJson, graderSchema } from './shared';
import { RunnableConfig } from '@langchain/core/runnables';
import { ILoggerProvider } from '../../application/ports/logger.port';

function makeLogger(): ILoggerProvider {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('getConfig', () => {
  it('extracts configurable from RunnableConfig', () => {
    const mockLLM = { completion: vi.fn() };
    const mockVectorStore = { search: vi.fn() };
    const mockObsPort = { log: vi.fn() };
    const mockLogger = makeLogger();
    const config: RunnableConfig = {
      configurable: { llmProvider: mockLLM, vectorStore: mockVectorStore, obsPort: mockObsPort, logger: mockLogger },
    };
    const result = getConfig(config);
    expect(result.llmProvider).toBe(mockLLM);
    expect(result.vectorStore).toBe(mockVectorStore);
  });
});

describe('logPayload', () => {
  it('logs input and output sizes', () => {
    const logger = makeLogger();
    logPayload(logger, 'test-node', { key: 'value' }, { result: 'data' });
    expect(logger.info).toHaveBeenCalledWith('[PAYLOAD] test-node', expect.objectContaining({
      inputSize: expect.any(Number), outputSize: expect.any(Number),
    }));
  });
});

describe('safeParseJson', () => {
  const logger = makeLogger();

  it('parses valid JSON', () => {
    expect(safeParseJson(logger, 'test', '{"key":"value"}', {})).toEqual({ key: 'value' });
  });

  it('returns fallback on parse error', () => {
    const fallback = { default: true };
    expect(safeParseJson(logger, 'test', 'invalid', fallback)).toBe(fallback);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('graderSchema', () => {
  it('validates grader output with YES', () => {
    const result = graderSchema.safeParse({ is_relevant: 'YES', reasoning: 'Evidence matches.' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_relevant).toBe('YES');
  });

  it('defaults is_relevant to NO', () => {
    const result = graderSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_relevant).toBe('NO');
  });
});
