import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetRecentMemoriesUseCase } from './get-recent-memories.use-case';
import { IMemoryRepository } from '../ports/memory-repository.port';

describe('GetRecentMemoriesUseCase', () => {
  let useCase: GetRecentMemoriesUseCase;
  let mockRepo: IMemoryRepository;

  beforeEach(() => {
    mockRepo = {
      getByUserId: vi.fn(),
    } as any;
    useCase = new GetRecentMemoriesUseCase(mockRepo);
  });

  it('should fetch memories for a user', async () => {
    const mockMemories = [
      { id: '1', userId: 'u1', fact: 'Fact 1', category: 'episodic', createdAt: new Date() }
    ];
    vi.mocked(mockRepo.getByUserId).mockResolvedValue(mockMemories as any);

    const result = await useCase.execute('u1', 10);

    expect(result).toEqual(mockMemories);
    expect(mockRepo.getByUserId).toHaveBeenCalledWith('u1', 10);
  });
});
