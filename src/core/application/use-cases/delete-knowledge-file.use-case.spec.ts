import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteKnowledgeFileUseCase } from './delete-knowledge-file.use-case';
import { IVectorStorePort } from '../ports/vector-store.port';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

describe('DeleteKnowledgeFileUseCase', () => {
  let useCase: DeleteKnowledgeFileUseCase;
  let mockVectorStore: IVectorStorePort;
  let mockKnowledgeRepo: IKnowledgeRepositoryPort;

  beforeEach(() => {
    mockVectorStore = {
      deleteBySource: vi.fn().mockResolvedValue(undefined),
      ensureCollection: vi.fn(),
      upsert: vi.fn(),
      search: vi.fn(),
      keywordSearch: vi.fn(),
      listBySource: vi.fn(),
      isIndexed: vi.fn(),
    };
    mockKnowledgeRepo = {
      deleteFile: vi.fn().mockResolvedValue(undefined),
      listFiles: vi.fn(),
      getFileByFilename: vi.fn(),
      upsertFile: vi.fn(),
      listCollections: vi.fn(),
      createCollection: vi.fn(),
      updateCollection: vi.fn(),
      deleteCollection: vi.fn(),
    };

    useCase = new DeleteKnowledgeFileUseCase(mockVectorStore, mockKnowledgeRepo);
  });

  it('deletes vector store points by source in the correct collection', async () => {
    await useCase.execute('file-123', 'test.md', 'test-collection');

    expect(mockVectorStore.deleteBySource).toHaveBeenCalledWith('test.md', 'test-collection');
  });

  it('deletes the database record after vector cleanup', async () => {
    await useCase.execute('file-456', 'doc.pdf', 'courses');

    expect(mockKnowledgeRepo.deleteFile).toHaveBeenCalledWith('file-456');
  });

  it('deletes vector points before database record (ordering)', async () => {
    const callOrder: string[] = [];
    vi.mocked(mockVectorStore.deleteBySource).mockImplementation(() => {
      callOrder.push('vector');
      return Promise.resolve();
    });
    vi.mocked(mockKnowledgeRepo.deleteFile).mockImplementation(() => {
      callOrder.push('db');
      return Promise.resolve();
    });

    await useCase.execute('file-789', 'data.md', 'collection');
    expect(callOrder).toEqual(['vector', 'db']);
  });

  it('propagates vector store errors', async () => {
    vi.mocked(mockVectorStore.deleteBySource).mockRejectedValue(new Error('Qdrant connection failed'));

    await expect(
      useCase.execute('file-123', 'test.md', 'collection')
    ).rejects.toThrow('Qdrant connection failed');
  });

  it('propagates knowledge repo errors', async () => {
    vi.mocked(mockKnowledgeRepo.deleteFile).mockRejectedValue(new Error('Database error'));

    await expect(
      useCase.execute('file-123', 'test.md', 'collection')
    ).rejects.toThrow('Database error');
  });
});
