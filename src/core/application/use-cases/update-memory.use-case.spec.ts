import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMemoryUseCase } from './update-memory.use-case';
import { IMemoryRepository } from '../ports/memory-repository.port';

describe('UpdateMemoryUseCase', () => {
  let useCase: UpdateMemoryUseCase;
  let mockRepo: IMemoryRepository;

  beforeEach(() => {
    mockRepo = {
      update: vi.fn().mockResolvedValue(undefined),
    } as any;
    useCase = new UpdateMemoryUseCase(mockRepo);
  });

  it('should call repository to update a memory', async () => {
    await useCase.execute('mem-1', 'user-1', 'Updated fact');
    expect(mockRepo.update).toHaveBeenCalledWith('mem-1', 'user-1', 'Updated fact');
  });
});
