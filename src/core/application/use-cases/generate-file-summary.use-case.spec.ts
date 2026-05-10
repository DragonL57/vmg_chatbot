import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateFileSummaryUseCase } from './generate-file-summary.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

describe('GenerateFileSummaryUseCase', () => {
  let useCase: GenerateFileSummaryUseCase;
  let mockLLM: ILLMProvider;
  let mockKnowledgeRepo: IKnowledgeRepositoryPort;

  const testContent = '# Introduction\nThis is a comprehensive guide.\n\n## Chapter 1\nContent of chapter one. '.repeat(50);

  beforeEach(() => {
    mockLLM = {
      completion: vi.fn().mockResolvedValue({
        content: 'A comprehensive guide covering introduction and chapter content.',
        usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 },
        model: 'test-model',
      }),
    };
    mockKnowledgeRepo = {
      listFiles: vi.fn(),
      getFileByFilename: vi.fn(),
      upsertFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      listCollections: vi.fn(),
      createCollection: vi.fn(),
      updateCollection: vi.fn(),
      deleteCollection: vi.fn(),
    };

    useCase = new GenerateFileSummaryUseCase(mockLLM, mockKnowledgeRepo);
  });

  it('generates a summary from file content', async () => {
    const summary = await useCase.execute('file-1', testContent);

    expect(summary).toBe('A comprehensive guide covering introduction and chapter content.');
  });

  it('extracts headings for structure in the prompt', async () => {
    await useCase.execute('file-1', '# Title\n## Section\n### Subsection\nContent here.');

    expect(mockLLM.completion).toHaveBeenCalled();
    const callArgs = vi.mocked(mockLLM.completion).mock.calls[0][0];
    const userMessage = callArgs.messages.find(m => m.role === 'user')?.content || '';
    expect(userMessage).toContain('Title');
    expect(userMessage).toContain('Section');
    expect(userMessage).toContain('Subsection');
  });

  it('samples multiple sections of the content', async () => {
    await useCase.execute('file-1', testContent);

    expect(mockLLM.completion).toHaveBeenCalled();
    const callArgs = vi.mocked(mockLLM.completion).mock.calls[0][0];
    const userMessage = callArgs.messages.find(m => m.role === 'user')?.content || '';
    expect(userMessage).toContain('SAMPLED SNIPPETS');
    expect(userMessage.split('---').length).toBeGreaterThan(1);
  });

  it('upserts the summary on the file record', async () => {
    await useCase.execute('file-1', testContent);

    expect(mockKnowledgeRepo.upsertFile).toHaveBeenCalledWith({
      id: 'file-1',
      summary: 'A comprehensive guide covering introduction and chapter content.',
    });
  });

  it('returns empty string when LLM returns no content', async () => {
    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: null,
      usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      model: 'test-model',
    });

    const summary = await useCase.execute('file-1', 'Short content.');
    expect(summary).toBe('');
    expect(mockKnowledgeRepo.upsertFile).not.toHaveBeenCalled();
  });

  it('handles extremely long content with multiple samples', async () => {
    const veryLongContent = '# H1\n' + 'A'.repeat(3000) + '\n## H2\n' + 'B'.repeat(3000);
    await useCase.execute('file-1', veryLongContent);

    expect(mockLLM.completion).toHaveBeenCalled();
  });

  it('handles content with no headings', async () => {
    await useCase.execute('file-1', 'This is a simple paragraph with no headings at all. '.repeat(30));

    expect(mockLLM.completion).toHaveBeenCalled();
  });
});
