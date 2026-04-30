import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetRecentMemoriesUseCase } from './get-recent-memories.use-case';
import { IMemoryRepository } from '../ports/memory-repository.port';

describe('GetRecentMemoriesUseCase', () => {
  let useCase: GetRecentMemoriesUseCase;
  let mockRepo: IMemoryRepository;

  beforeEach(() => {
    mockRepo = {
      getByUserId: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new GetRecentMemoriesUseCase(mockRepo);
  });

  it('should fetch memories for a user', async () => {
    const mockMemories = [
      { id: '1', userId: 'u1', fact: 'Fact 1', category: 'episodic' as const, createdAt: new Date() }
    ];
    vi.mocked(mockRepo.getByUserId).mockResolvedValue(mockMemories);

    const result = await useCase.execute('u1', 10);

    expect(result).toEqual(mockMemories);
    expect(mockRepo.getByUserId).toHaveBeenCalledWith('u1', 10);
  });
});
