import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateCollectionDescriptionUseCase } from './generate-collection-description.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

describe('GenerateCollectionDescriptionUseCase', () => {
  let useCase: GenerateCollectionDescriptionUseCase;
  let mockLLM: ILLMProvider;
  let mockKnowledgeRepo: IKnowledgeRepositoryPort;

  beforeEach(() => {
    mockLLM = {
      completion: vi.fn().mockResolvedValue({
        content: 'A collection of VSTEP exam materials covering all four skills.',
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        model: 'test-model',
      }),
    };
    mockKnowledgeRepo = {
      listFiles: vi.fn().mockResolvedValue([
        { id: '1', filename: 'vstep_speaking.md', mode: 'vstep', status: 'completed', summary: 'Speaking guide', progress: 100 },
        { id: '2', filename: 'vstep_writing.md', mode: 'vstep', status: 'completed', summary: 'Writing guide', progress: 100 },
        { id: '3', filename: 'vstep_reading.md', mode: 'vstep', status: 'completed', summary: null, progress: 100 },
        { id: '4', filename: 'vstep_draft.md', mode: 'vstep', status: 'indexing', summary: null, progress: 45 },
      ]),
      getFileByFilename: vi.fn(),
      upsertFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      listCollections: vi.fn(),
      createCollection: vi.fn(),
      updateCollection: vi.fn().mockResolvedValue(undefined),
      deleteCollection: vi.fn(),
    };

    useCase = new GenerateCollectionDescriptionUseCase(mockLLM, mockKnowledgeRepo);
  });

  it('generates a description from completed file summaries', async () => {
    const description = await useCase.execute('col-1', 'vstep');

    expect(mockKnowledgeRepo.listFiles).toHaveBeenCalled();
    expect(mockLLM.completion).toHaveBeenCalled();
    expect(description).toBe('A collection of VSTEP exam materials covering all four skills.');
  });

  it('updates collection description after generation', async () => {
    await useCase.execute('col-1', 'vstep');

    expect(mockKnowledgeRepo.updateCollection).toHaveBeenCalledWith('col-1', {
      description: 'A collection of VSTEP exam materials covering all four skills.',
    });
  });

  it('returns empty string when no files match the collection', async () => {
    vi.mocked(mockKnowledgeRepo.listFiles).mockResolvedValue([
      { id: '5', filename: 'other.md', mode: 'other-collection', status: 'completed', summary: 'Other', progress: 100 },
    ]);

    const description = await useCase.execute('col-1', 'vstep');
    expect(description).toBe('');
    expect(mockLLM.completion).not.toHaveBeenCalled();
  });

  it('returns empty string when no files have summaries', async () => {
    vi.mocked(mockKnowledgeRepo.listFiles).mockResolvedValue([
      { id: '6', filename: 'empty.md', mode: 'vstep', status: 'completed', summary: null, progress: 100 },
    ]);

    const description = await useCase.execute('col-1', 'vstep');
    expect(description).toBe('');
  });

  it('returns empty string when LLM returns no content', async () => {
    vi.mocked(mockLLM.completion).mockResolvedValue({
      content: null,
      usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      model: 'test-model',
    });

    const description = await useCase.execute('col-1', 'vstep');
    expect(description).toBe('');
  });

  it('filters out non-completed files (indexing file id 4 excluded)', async () => {
    await useCase.execute('col-1', 'vstep');
    // Only completed files with summaries should be passed to LLM
    expect(mockLLM.completion).toHaveBeenCalledTimes(1);
  });
});
