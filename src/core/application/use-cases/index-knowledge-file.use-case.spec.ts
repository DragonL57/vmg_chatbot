import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndexKnowledgeFileUseCase } from './index-knowledge-file.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

vi.mock('../../infrastructure/adapters/pageindex.adapter', () => ({
  buildAndStoreTree: vi.fn().mockResolvedValue({
    sourceFile: 'test.md',
    documentTitle: 'Test',
    root: { id: 'r', title: 'Test', level: 0, children: [] },
    totalNodes: 5,
    depth: 3,
    generatedAt: new Date().toISOString(),
  }),
  searchAllFiles: vi.fn().mockResolvedValue({ passages: [], trace: '' }),
  collectionUsesPageIndex: vi.fn().mockResolvedValue(false),
  getFileTree: vi.fn().mockResolvedValue(null),
}));

function makeMocks() {
  return {
    llm: {
      completion: vi.fn().mockResolvedValue({
        content: 'This is a test summary.',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'test-model',
      }),
    } as ILLMProvider,
    knowledgeRepo: {
      listFiles: vi.fn().mockResolvedValue([]),
      getFileByFilename: vi.fn(), upsertFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      listCollections: vi.fn().mockResolvedValue([{ id: '1', collectionKey: 'test-collection', name: 'Test' }]),
      createCollection: vi.fn(), updateCollection: vi.fn().mockResolvedValue(undefined),
      deleteCollection: vi.fn(),
    } as IKnowledgeRepositoryPort,
  };
}

const BASE_INPUT = { markdown: '# Test Content\nThis is a test.', sourceFile: 'test.md', collectionName: 'test-collection', fileId: 'file-123' };

describe('IndexKnowledgeFileUseCase - PageIndex pipeline', () => {
  let useCase: IndexKnowledgeFileUseCase;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = makeMocks();
    useCase = new IndexKnowledgeFileUseCase(mocks.llm, mocks.knowledgeRepo);
  });

  it('should build a PageIndex tree successfully', async () => {
    await useCase.execute(BASE_INPUT);
    const { buildAndStoreTree } = await import('../../infrastructure/adapters/pageindex.adapter');
    expect(buildAndStoreTree).toHaveBeenCalled();
  });

  it('should call LLM for file summary', async () => {
    await useCase.execute(BASE_INPUT);
    expect(mocks.llm.completion).toHaveBeenCalled();
  });

  it('should handle tree building failure', async () => {
    const { buildAndStoreTree } = await import('../../infrastructure/adapters/pageindex.adapter');
    vi.mocked(buildAndStoreTree).mockRejectedValueOnce(new Error('Tree build failed'));

    await useCase.execute(BASE_INPUT);
    expect(mocks.knowledgeRepo.upsertFile).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
    }));
  });

  it('should handle empty markdown gracefully', async () => {
    await useCase.execute({ ...BASE_INPUT, markdown: '', fileId: 'file-empty' });
    const { buildAndStoreTree } = await import('../../infrastructure/adapters/pageindex.adapter');
    expect(buildAndStoreTree).toHaveBeenCalled();
  });
});
