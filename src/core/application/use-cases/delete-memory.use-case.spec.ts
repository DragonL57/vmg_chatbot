import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMemoryUseCase } from './delete-memory.use-case';
import { IMemoryRepository } from '../ports/memory-repository.port';

describe('DeleteMemoryUseCase', () => {
  let useCase: DeleteMemoryUseCase;
  let mockRepo: IMemoryRepository;

  beforeEach(() => {
    mockRepo = {
      delete: vi.fn().mockResolvedValue(undefined),
    } as any;
    useCase = new DeleteMemoryUseCase(mockRepo);
  });

  it('should call repository to delete a memory', async () => {
    await useCase.execute('mem-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('mem-1', 'user-1');
  });
});
