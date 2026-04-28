import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtractUserMemoriesUseCase } from './extract-user-memories.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IMemoryRepository } from '../ports/memory-repository.port';
import { IObservabilityPort } from '../ports/observability.port';
import { ILoggerProvider } from '../ports/logger.port';

describe('ExtractUserMemoriesUseCase', () => {
  let useCase: ExtractUserMemoriesUseCase;
  let mockLLM: ILLMProvider;
  let mockRepo: IMemoryRepository;
  let mockObs: IObservabilityPort;
  let mockLogger: ILoggerProvider;

  beforeEach(() => {
    mockLLM = {
      completion: vi.fn(),
    } as any;
    mockRepo = {
      getByUserId: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } as any;
    mockObs = {
      emitSpan: vi.fn().mockResolvedValue(undefined),
    } as any;
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    useCase = new ExtractUserMemoriesUseCase(mockLLM, mockRepo, mockObs, mockLogger);
  });

  it('should extract and add a new memory', async () => {
    const input = {
      userId: 'user-123',
      messages: [{ role: 'user', content: 'Tôi thích ăn phở.' }],
      traceId: 'trace-123'
    };

    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: JSON.stringify({
        actions: [{ op: 'ADD', fact: 'User thích ăn phở', category: 'preference' }]
      }),
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    } as any);

    const result = await useCase.execute(input);

    expect(result).toBe(1);
    expect(mockRepo.add).toHaveBeenCalledWith('user-123', 'User thích ăn phở', 'preference');
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should handle JSON parse errors gracefully', async () => {
    const input = {
      userId: 'user-123',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: 'invalid json',
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    } as any);

    const result = await useCase.execute(input);

    expect(result).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('JSON parse error'), expect.any(Error), expect.any(Object));
  });

  it('should handle validation errors gracefully', async () => {
    const input = {
      userId: 'user-123',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: JSON.stringify({ actions: [{ op: 'INVALID' }] }),
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    } as any);

    const result = await useCase.execute(input);

    expect(result).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid schema'), expect.any(Object));
  });
});
