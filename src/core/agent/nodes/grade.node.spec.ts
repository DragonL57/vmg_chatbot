import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicating the grader schema used in grade.node.ts
const graderSchema = z.object({
  is_relevant: z.string().default("NO"),
  reasoning: z.string().optional().default("")
});

describe('gradeNode - grader schema parsing', () => {
  it('parses relevant grade result', () => {
    const raw = '{"is_relevant": "YES", "reasoning": "The evidence directly answers the query."}';
    const parsed = JSON.parse(raw);
    const result = graderSchema.safeParse(parsed);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_relevant).toBe('YES');
      const isRelevant = result.data.is_relevant.toUpperCase() === 'YES';
      expect(isRelevant).toBe(true);
    }
  });

  it('parses non-relevant grade result', () => {
    const raw = '{"is_relevant": "NO", "reasoning": "Documents are about a different topic."}';
    const parsed = JSON.parse(raw);
    const result = graderSchema.safeParse(parsed);

    expect(result.success).toBe(true);
    if (result.success) {
      const isRelevant = result.data.is_relevant.toUpperCase() === 'YES';
      expect(isRelevant).toBe(false);
    }
  });

  it('defaults to NO when is_relevant missing', () => {
    const raw = '{"reasoning": "Some reasoning"}';
    const parsed = JSON.parse(raw);
    const result = graderSchema.safeParse(parsed);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_relevant).toBe('NO');
    }
  });

  it('handles lowercase yes', () => {
    const raw = '{"is_relevant": "yes", "reasoning": "Found relevant info"}';
    const parsed = JSON.parse(raw);
    const result = graderSchema.safeParse(parsed);

    expect(result.success).toBe(true);
    if (result.success) {
      const isRelevant = result.data.is_relevant.toUpperCase() === 'YES';
      expect(isRelevant).toBe(true);
    }
  });

  it('returns false for malformed JSON', () => {
    // Simulating the try/catch in gradeNode
    let grade = false;
    try {
      const parsed = JSON.parse('not json');
      const result = graderSchema.safeParse(parsed);
      if (result.success) {
        grade = result.data.is_relevant.toUpperCase() === 'YES';
      }
    } catch {
      grade = false;
    }
    expect(grade).toBe(false);
  });

  it('returns false when grader schema validation fails', () => {
    const raw = '{"is_relevant": 123, "reasoning": []}'; // Wrong types
    let grade = false;
    try {
      const parsed = JSON.parse(raw);
      const result = graderSchema.safeParse(parsed);
      if (result.success) {
        grade = result.data.is_relevant.toUpperCase() === 'YES';
      }
    } catch {
      grade = false;
    }
    expect(grade).toBe(false);
  });
});
