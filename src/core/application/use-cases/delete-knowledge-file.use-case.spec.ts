import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteKnowledgeFileUseCase } from './delete-knowledge-file.use-case';
import { IKnowledgeRepositoryPort } from '../ports/knowledge-repository.port';

describe('DeleteKnowledgeFileUseCase', () => {
  let useCase: DeleteKnowledgeFileUseCase;
  let mockKnowledgeRepo: IKnowledgeRepositoryPort;

  beforeEach(() => {
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

    useCase = new DeleteKnowledgeFileUseCase(mockKnowledgeRepo);
  });

  it('deletes the database record', async () => {
    await useCase.execute('file-456');
    expect(mockKnowledgeRepo.deleteFile).toHaveBeenCalledWith('file-456');
  });

  it('propagates knowledge repo errors', async () => {
    vi.mocked(mockKnowledgeRepo.deleteFile).mockRejectedValue(new Error('Database error'));

    await expect(
      useCase.execute('file-123')
    ).rejects.toThrow('Database error');
  });
});
