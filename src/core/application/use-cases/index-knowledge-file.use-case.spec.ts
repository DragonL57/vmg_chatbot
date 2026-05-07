import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndexKnowledgeFileUseCase } from './index-knowledge-file.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IVectorStorePort } from '../ports/vector-store.port';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

function makeMocks() {
  return {
    llm: {
      completion: vi.fn().mockResolvedValue({
        content: JSON.stringify({ questions: ['What is this?'] }),
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'test-model',
      }),
    } as ILLMProvider,
    vectorStore: {
      ensureCollection: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(), keywordSearch: vi.fn(), listBySource: vi.fn(),
      deleteBySource: vi.fn(), isIndexed: vi.fn(),
    } as IVectorStorePort,
    knowledgeRepo: {
      listFiles: vi.fn().mockResolvedValue([]),
      getFileByFilename: vi.fn(), upsertFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      listCollections: vi.fn().mockResolvedValue([{ id: '1', qdrantName: 'test-collection', name: 'Test' }]),
      createCollection: vi.fn(), updateCollection: vi.fn().mockResolvedValue(undefined),
      deleteCollection: vi.fn(),
    } as IKnowledgeRepositoryPort,
  };
}

const BASE_INPUT = { markdown: '# Test Content\nThis is a test.', sourceFile: 'test.md', collectionName: 'test-collection', fileId: 'file-123' };

describe('IndexKnowledgeFileUseCase - success path', () => {
  let useCase: IndexKnowledgeFileUseCase;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    useCase = new IndexKnowledgeFileUseCase(mocks.llm, mocks.vectorStore, mocks.knowledgeRepo);
  });

  it('should process a markdown file and index it', async () => {
    await useCase.execute(BASE_INPUT);
    expect(mocks.vectorStore.ensureCollection).toHaveBeenCalledWith('test-collection');
    expect(mocks.vectorStore.upsert).toHaveBeenCalled();
    expect(mocks.knowledgeRepo.upsertFile).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed', progress: 100,
    }));
  });
});

describe('IndexKnowledgeFileUseCase - error paths', () => {
  let useCase: IndexKnowledgeFileUseCase;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    useCase = new IndexKnowledgeFileUseCase(mocks.llm, mocks.vectorStore, mocks.knowledgeRepo);
  });

  it('should handle errors during indexing (vector store failure)', async () => {
    vi.mocked(mocks.vectorStore.ensureCollection).mockRejectedValue(new Error('Vector store error'));
    await useCase.execute(BASE_INPUT);
    expect(mocks.knowledgeRepo.upsertFile).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('should handle LLM failure (enrich uses fallback, finalize fails)', async () => {
    vi.mocked(mocks.llm.completion).mockRejectedValue(new Error('LLM timeout'));
    const input = { ...BASE_INPUT, markdown: '# Test\n' + 'Content. '.repeat(200), fileId: 'file-fallback' };
    await useCase.execute(input);
    const finalCall = vi.mocked(mocks.knowledgeRepo.upsertFile).mock.calls.at(-1)?.[0];
    expect(finalCall).toBeDefined();
    expect((finalCall as Record<string, unknown>).status).toBe('failed');
  });

  it('should handle empty markdown gracefully', async () => {
    await useCase.execute({ ...BASE_INPUT, markdown: '', fileId: 'file-empty' });
    expect(mocks.knowledgeRepo.upsertFile).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });
});
