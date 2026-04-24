import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from './memory.service';
import { db } from '../db';
import { getSleepTimeProvider } from '../lib/providers';

// Mock dependencies
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../db/schema', () => ({
  userMemories: {
    id: { name: 'id' },
    userId: { name: 'user_id' },
    fact: { name: 'fact' },
    category: { name: 'category' },
    createdAt: { name: 'created_at' },
  },
}));

vi.mock('../lib/providers', () => ({
  getSleepTimeProvider: vi.fn(),
}));

describe('MemoryService Unit Tests', () => {
  const mockUserId = 'user-uuid-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserMemories', () => {
    it('should fetch memories with a default limit', async () => {
      const mockResult = [{ id: '1', fact: 'Fact 1' }];
      const mockOrderBy = { limit: vi.fn().mockResolvedValue(mockResult) };
      const mockWhere = { orderBy: vi.fn().mockReturnValue(mockOrderBy) };
      const mockFrom = { where: vi.fn().mockReturnValue(mockWhere) };
      (db.select as any).mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

      const memories = await MemoryService.getUserMemories(mockUserId);
      
      expect(memories).toEqual(mockResult);
      expect(mockOrderBy.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('extractAndSaveMemories', () => {
    it('should validate and save new facts in third person', async () => {
      // 1. Mock existing memories to check deduplication
      const mockOrderBy = { limit: vi.fn().mockResolvedValue([]) };
      const mockWhere = { orderBy: vi.fn().mockReturnValue(mockOrderBy) };
      const mockFrom = { where: vi.fn().mockReturnValue(mockWhere) };
      (db.select as any).mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

      // 2. Mock LLM response with the new Curator Schema
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              actions: [
                { op: 'ADD', fact: 'Người dùng thích học SAT', category: 'preference' }
              ]
            })
          }
        }]
      };
      (getSleepTimeProvider as any).mockReturnValue({
        client: { chat: { completions: { create: vi.fn().mockResolvedValue(mockLLMResponse) } } }
      });

      // 3. Mock DB Insert
      const mockValues = { onConflictDoNothing: vi.fn().mockResolvedValue({}) };
      (db.insert as any).mockReturnValue({ values: vi.fn().mockReturnValue(mockValues) });

      const count = await MemoryService.extractAndSaveMemories(mockUserId, [{ role: 'user', content: 'Tôi thích học SAT' }]);
      
      expect(count).toBe(1);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should reject invalid JSON from LLM gracefully', async () => {
      // Setup current state to allow fetch before LLM call
      const mockOrderBy = { limit: vi.fn().mockResolvedValue([]) };
      const mockWhere = { orderBy: vi.fn().mockReturnValue(mockOrderBy) };
      const mockFrom = { where: vi.fn().mockReturnValue(mockWhere) };
      (db.select as any).mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

      const mockLLMResponse = {
        choices: [{ message: { content: 'invalid-json' } }]
      };
      (getSleepTimeProvider as any).mockReturnValue({
        client: { chat: { completions: { create: vi.fn().mockResolvedValue(mockLLMResponse) } } }
      });

      const count = await MemoryService.extractAndSaveMemories(mockUserId, []);
      expect(count).toBe(0);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should handle deletion actions correctly', async () => {
      const mockOrderBy = { limit: vi.fn().mockResolvedValue([]) };
      const mockWhere = { orderBy: vi.fn().mockReturnValue(mockOrderBy) };
      const mockFrom = { where: vi.fn().mockReturnValue(mockWhere) };
      (db.select as any).mockReturnValue({ from: vi.fn().mockReturnValue(mockFrom) });

      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              actions: [{ op: 'DELETE', id: 'f87a3b3a-67d4-47c3-8f0a-6e9c9c8f0a6e' }]
            })
          }
        }]
      };
      (getSleepTimeProvider as any).mockReturnValue({
        client: { chat: { completions: { create: vi.fn().mockResolvedValue(mockLLMResponse) } } }
      });

      (db.delete as any).mockReturnValue({ where: vi.fn().mockResolvedValue({}) });

      const count = await MemoryService.extractAndSaveMemories(mockUserId, []);
      expect(count).toBe(1);
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
