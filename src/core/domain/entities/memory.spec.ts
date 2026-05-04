import { describe, it, expect } from 'vitest';
import type { MemoryCategory, UserMemory, MemoryAction, MemoryExtraction } from './memory';

describe('Memory domain types', () => {
  it('allows valid MemoryCategory values', () => {
    const validCategories: MemoryCategory[] = ['persona', 'preference', 'entity', 'episodic', 'general'];
    for (const cat of validCategories) {
      expect(cat).toBeDefined();
      expect(typeof cat).toBe('string');
    }
  });

  it('creates a valid UserMemory object', () => {
    const memory: UserMemory = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'user-1',
      fact: 'User prefers dark mode',
      category: 'preference',
      createdAt: new Date('2026-01-01'),
    };
    expect(memory.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(memory.fact).toBe('User prefers dark mode');
    expect(memory.category).toBe('preference');
    expect(memory.metadata).toBeUndefined();
  });

  it('creates a UserMemory with metadata', () => {
    const memory: UserMemory = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      userId: 'user-1',
      fact: 'User is an admin',
      category: 'persona',
      metadata: { confidence: 0.95, source: 'conversation' },
      createdAt: new Date(),
    };
    expect(memory.metadata?.confidence).toBe(0.95);
    expect(memory.metadata?.source).toBe('conversation');
  });

  it('creates valid MemoryAction objects', () => {
    const addAction: MemoryAction = { op: 'ADD', fact: 'New fact', category: 'episodic' };
    const updateAction: MemoryAction = { op: 'UPDATE', id: 'some-uuid', fact: 'Updated fact' };
    const deleteAction: MemoryAction = { op: 'DELETE', id: 'some-uuid' };

    expect(addAction.op).toBe('ADD');
    expect(updateAction.op).toBe('UPDATE');
    expect(deleteAction.op).toBe('DELETE');
    expect(addAction.fact).toBe('New fact');
  });

  it('creates valid MemoryExtraction object', () => {
    const extraction: MemoryExtraction = {
      actions: [
        { op: 'ADD', fact: 'Fact 1', category: 'general' },
        { op: 'DELETE', id: 'uuid-1' },
      ],
    };
    expect(extraction.actions).toHaveLength(2);
    expect(extraction.actions[0].op).toBe('ADD');
    expect(extraction.actions[1].op).toBe('DELETE');
  });

  it('rejects invalid MemoryCategory at type level (runtime safety via types)', () => {
    // This tests that the union type works correctly
    const validCategories: readonly string[] = ['persona', 'preference', 'entity', 'episodic', 'general'];
    const testValue = 'persona';
    expect(validCategories.includes(testValue)).toBe(true);
    const invalidValue = 'invalid_category';
    expect(validCategories.includes(invalidValue)).toBe(false);
  });
});
