import { describe, it, expect, vi } from 'vitest';
import { GetInternalUserIdUseCase } from './get-internal-user-id.use-case';
import { IAuthRepository } from '../ports/auth-repository.port';

describe('GetInternalUserIdUseCase', () => {
  it('returns internal user id when found', async () => {
    const mockAuthRepo: IAuthRepository = {
      getInternalId: vi.fn().mockResolvedValue('internal-123'),
      getUser: vi.fn(),
      getOrCreateUser: vi.fn(),
      isAdmin: vi.fn(),
    };

    const useCase = new GetInternalUserIdUseCase(mockAuthRepo);
    const result = await useCase.execute('supabase-123');
    expect(result).toBe('internal-123');
    expect(mockAuthRepo.getInternalId).toHaveBeenCalledWith('supabase-123');
  });

  it('returns null when user not found', async () => {
    const mockAuthRepo: IAuthRepository = {
      getInternalId: vi.fn().mockResolvedValue(null),
      getUser: vi.fn(),
      getOrCreateUser: vi.fn(),
      isAdmin: vi.fn(),
    };

    const useCase = new GetInternalUserIdUseCase(mockAuthRepo);
    const result = await useCase.execute('unknown-user');
    expect(result).toBeNull();
  });
});
