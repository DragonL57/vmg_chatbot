import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateTitleUseCase } from './generate-title.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IChatRepository } from '../ports/chat-repository.port';

describe('GenerateTitleUseCase', () => {
  let useCase: GenerateTitleUseCase;
  let mockLLM: ILLMProvider;
  let mockChatRepo: IChatRepository;

  beforeEach(() => {
    mockLLM = {
      completion: vi.fn().mockResolvedValue({
        content: 'VSTEP Exam Preparation Question',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'test-model',
      }),
    };
    mockChatRepo = {
      rename: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      star: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      save: vi.fn(),
    };

    useCase = new GenerateTitleUseCase(mockLLM, mockChatRepo);
  });

  it('generates a title from the first message', async () => {
    const title = await useCase.execute(
      'conv-123',
      'user-456',
      'Cho tôi hỏi về chương trình VSTEP Mastery?'
    );

    expect(title).toBe('VSTEP Exam Preparation Question');
  });

  it('calls chatRepo.rename with generated title', async () => {
    await useCase.execute('conv-123', 'user-456', 'Hello world');

    expect(mockChatRepo.rename).toHaveBeenCalledWith(
      'conv-123',
      'user-456',
      'VSTEP Exam Preparation Question'
    );
  });

  it('strips quotes from generated title', async () => {
    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: '"Quoted Title Here"',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      model: 'test-model',
    });

    const title = await useCase.execute('conv-1', 'user-1', 'Test');
    expect(title).toBe('Quoted Title Here');
  });

  it('falls back to "New Conversation" when LLM returns no content', async () => {
    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: null,
      usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      model: 'test-model',
    });

    const title = await useCase.execute('conv-1', 'user-1', 'Test');
    expect(title).toBe('New Conversation');
    expect(mockChatRepo.rename).toHaveBeenCalledWith('conv-1', 'user-1', 'New Conversation');
  });

  it('passes firstMessage content to the LLM', async () => {
    const firstMessage = 'Tôi muốn tìm hiểu về học bổng du học Úc';
    await useCase.execute('conv-1', 'user-1', firstMessage);

    expect(mockLLM.completion).toHaveBeenCalled();
    const callArgs = vi.mocked(mockLLM.completion).mock.calls[0][0];
    const userContent = callArgs.messages.find(m => m.role === 'user')?.content;
    expect(userContent).toBe(firstMessage);
  });
});
