import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndexKnowledgeFileUseCase } from './index-knowledge-file.use-case';
import { ILLMProvider } from '../ports/llm-provider.port';
import { IVectorStorePort } from '../ports/vector-store.port';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

describe('IndexKnowledgeFileUseCase', () => {
  let useCase: IndexKnowledgeFileUseCase;
  let mockLLM: ILLMProvider;
  let mockVectorStore: IVectorStorePort;
  let mockKnowledgeRepo: IKnowledgeRepositoryPort;

  beforeEach(() => {
    mockLLM = {
      completion: vi.fn().mockResolvedValue({
        content: JSON.stringify({ questions: ['What is this?'] }),
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'test-model'
      })
    };
    mockVectorStore = {
      ensureCollection: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      keywordSearch: vi.fn(),
      listBySource: vi.fn(),
      deleteBySource: vi.fn(),
      isIndexed: vi.fn()
    };
    mockKnowledgeRepo = {
      listFiles: vi.fn().mockResolvedValue([]),
      getFileByFilename: vi.fn(),
      upsertFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      listCollections: vi.fn().mockResolvedValue([{ id: '1', qdrantName: 'test-collection', name: 'Test' }]),
      createCollection: vi.fn(),
      updateCollection: vi.fn().mockResolvedValue(undefined),
      deleteCollection: vi.fn()
    };

    useCase = new IndexKnowledgeFileUseCase(mockLLM, mockVectorStore, mockKnowledgeRepo);
  });

  it('should process a markdown file and index it', async () => {
    const input = {
      markdown: '# Test Content\nThis is a test.',
      sourceFile: 'test.md',
      collectionName: 'test-collection',
      fileId: 'file-123'
    };

    await useCase.execute(input);

    expect(mockVectorStore.ensureCollection).toHaveBeenCalledWith('test-collection');
    expect(mockVectorStore.upsert).toHaveBeenCalled();
    expect(mockKnowledgeRepo.upsertFile).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      progress: 100
    }));
  });

  it('should handle errors during indexing', async () => {
    vi.mocked(mockVectorStore.ensureCollection).mockRejectedValue(new Error('Vector store error'));

    const input = {
      markdown: '# Test Content',
      sourceFile: 'test.md',
      collectionName: 'test-collection',
      fileId: 'file-123'
    };

    await useCase.execute(input);

    expect(mockKnowledgeRepo.upsertFile).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed'
    }));
  });
});
