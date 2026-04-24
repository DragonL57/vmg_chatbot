import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from './memory.service';
import { db } from '../db';
import { userMemories } from '../db/schema';
import { getFastProvider } from '../lib/providers';

// Mock the database and providers
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('../db/schema', () => ({
  userMemories: {
    userId: { name: 'user_id' },
    createdAt: { name: 'created_at' },
    fact: { name: 'fact' },
  },
}));

vi.mock('../lib/providers', () => ({
  getFastProvider: vi.fn(),
}));

describe('MemoryService', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserMemories', () => {
    it('should retrieve memories for a user', async () => {
      const mockMemories = [
        { id: '1', fact: 'User likes coffee', category: 'preference' },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMemories),
      };

      (db.select as any).mockReturnValue(mockSelect);

      const result = await MemoryService.getUserMemories(mockUserId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockMemories);
    });
  });

  describe('extractAndSaveMemories', () => {
    it('should extract and save new third-person facts', async () => {
      // 1. Setup existing memories (deduplication check)
      const existingMemories = [{ id: '1', fact: 'User is a teacher', category: 'persona' }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(existingMemories),
      };
      (db.select as any).mockReturnValue(mockSelect);

      // 2. Mock LLM Response
      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                memories: [
                  { fact: 'User is a teacher', category: 'persona' }, // Duplicate
                  { fact: 'Người dùng làm việc tại VMG', category: 'persona' }, // New
                ],
              }),
            },
          },
        ],
      };

      (getFastProvider as any).mockReturnValue({
        client: {
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue(mockLLMResponse),
            },
          },
        },
        model: 'test-model',
      });

      // 3. Mock DB Insert
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockResolvedValue({}),
      };
      (db.insert as any).mockReturnValue(mockInsert);

      const messages = [{ role: 'user', content: 'Tôi làm việc ở VMG' }];
      const count = await MemoryService.extractAndSaveMemories(mockUserId, messages);

      // 4. Assertions
      expect(count).toBe(1); // Only the new one saved
      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(mockInsert.values).toHaveBeenCalledWith(expect.objectContaining({
        fact: 'Người dùng làm việc tại VMG',
      }));
    });

    it('should return 0 if no new facts are found', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      });

      const mockLLMResponse = {
        choices: [{ message: { content: JSON.stringify({ memories: [] }) } }],
      };

      (getFastProvider as any).mockReturnValue({
        client: {
          chat: {
            completions: { create: vi.fn().mockResolvedValue(mockLLMResponse) },
          },
        },
      });

      const count = await MemoryService.extractAndSaveMemories(mockUserId, []);
      expect(count).toBe(0);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });
});
