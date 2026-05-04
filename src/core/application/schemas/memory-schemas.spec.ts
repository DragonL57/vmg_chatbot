import { describe, it, expect } from 'vitest';
import { memoryCategorySchema, memoryActionSchema, memoryExtractionSchema } from './memory-schemas';

describe('memoryCategorySchema', () => {
  it('accepts valid categories', () => {
    const valid = ['persona', 'preference', 'entity', 'episodic', 'general'];
    for (const cat of valid) {
      expect(memoryCategorySchema.safeParse(cat).success).toBe(true);
    }
  });

  it('rejects invalid categories', () => {
    expect(memoryCategorySchema.safeParse('invalid').success).toBe(false);
    expect(memoryCategorySchema.safeParse('user').success).toBe(false);
    expect(memoryCategorySchema.safeParse('').success).toBe(false);
  });
});

describe('memoryActionSchema', () => {
  it('validates ADD action with fact', () => {
    const result = memoryActionSchema.safeParse({ op: 'ADD', fact: 'New memory', category: 'episodic' });
    expect(result.success).toBe(true);
  });

  it('validates UPDATE action with id and fact', () => {
    const result = memoryActionSchema.safeParse({ op: 'UPDATE', id: '550e8400-e29b-41d4-a716-446655440000', fact: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('validates DELETE action with id', () => {
    const result = memoryActionSchema.safeParse({ op: 'DELETE', id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects action without op', () => {
    const result = memoryActionSchema.safeParse({ fact: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid op value', () => {
    const result = memoryActionSchema.safeParse({ op: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid id', () => {
    const result = memoryActionSchema.safeParse({ op: 'UPDATE', id: 'not-a-uuid', fact: 'test' });
    expect(result.success).toBe(false);
  });
});

describe('memoryExtractionSchema', () => {
  it('validates extraction with multiple actions', () => {
    const result = memoryExtractionSchema.safeParse({
      actions: [
        { op: 'ADD', fact: 'Fact 1', category: 'general' },
        { op: 'DELETE', id: '550e8400-e29b-41d4-a716-446655440000' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('validates empty actions array', () => {
    const result = memoryExtractionSchema.safeParse({ actions: [] });
    expect(result.success).toBe(true);
  });

  it('rejects missing actions', () => {
    const result = memoryExtractionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
