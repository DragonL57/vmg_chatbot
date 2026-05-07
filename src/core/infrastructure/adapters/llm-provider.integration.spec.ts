import { describe, it, expect } from 'vitest';
import { LLMProviderAdapter } from './llm-provider.adapter';
import { ConsoleLoggerAdapter } from './console-logger.adapter';

describe('LLMProviderAdapter - real Poe integration', () => {
  const adapter = new LLMProviderAdapter();

  it('makes a real completion call (instant effort)', async () => {
    const res = await adapter.completion({
      messages: [{ role: 'user', content: 'Reply with exactly: hello' }],
      effort: 'instant',
    });

    expect(res.content).toBeTruthy();
    expect(res.model).toBeTruthy();
    expect(res.usage.prompt_tokens).toBeGreaterThan(0);
    expect(res.usage.completion_tokens).toBeGreaterThan(0);
    expect(res.usage.total_tokens).toBeGreaterThan(0);
  }, 30000);

  it('makes a completion with json mode', async () => {
    const res = await adapter.completion({
      messages: [{ role: 'user', content: 'Return JSON: {"greeting": "hello"}' }],
      jsonMode: true,
      effort: 'instant',
    });

    expect(res.content).toBeTruthy();
    const parsed = JSON.parse(res.content!);
    expect(parsed.greeting).toBe('hello');
  }, 30000);

  it('makes a completion with high effort', async () => {
    const res = await adapter.completion({
      messages: [{ role: 'user', content: 'Say hi' }],
      effort: 'high',
    });
    expect(res.content).toBeTruthy();
  }, 30000);

  it('makes a completion with low effort', async () => {
    const res = await adapter.completion({
      messages: [{ role: 'user', content: 'Say hi' }],
      effort: 'low',
    });
    expect(res.content).toBeTruthy();
  }, 30000);

  it('returns null content on empty response', async () => {
    const res = await adapter.completion({
      messages: [{ role: 'user', content: 'Hello' }],
      effort: 'instant',
    });
    expect(typeof res.content).toBe('string');
  }, 30000);
});

describe('ConsoleLoggerAdapter - real console output', () => {
  const logger = new ConsoleLoggerAdapter();

  it('logs info without error', () => {
    expect(() => logger.info('test info', { key: 'value' })).not.toThrow();
  });

  it('logs warn without error', () => {
    expect(() => logger.warn('test warn', { reason: 'test' })).not.toThrow();
  });

  it('logs error without error', () => {
    expect(() => logger.error('test error', new Error('boom'), { id: '1' })).not.toThrow();
  });
});
