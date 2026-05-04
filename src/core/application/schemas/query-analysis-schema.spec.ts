import { describe, it, expect } from 'vitest';
import { queryAnalysisSchema } from './query-analysis-schema';

describe('queryAnalysisSchema', () => {
  it('validates a clear query', () => {
    const result = queryAnalysisSchema.safeParse({
      is_clear: true,
      questions: ['What is the capital of France?'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_clear).toBe(true);
      expect(result.data.questions).toHaveLength(1);
    }
  });

  it('validates an unclear query with clarification', () => {
    const result = queryAnalysisSchema.safeParse({
      is_clear: false,
      questions: [],
      clarification_needed: 'Please specify...',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clarification_needed).toBe('Please specify...');
    }
  });

  it('validates without optional clarification_needed', () => {
    const result = queryAnalysisSchema.safeParse({
      is_clear: true,
      questions: ['Query'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clarification_needed).toBeUndefined();
    }
  });

  it('rejects missing is_clear', () => {
    const result = queryAnalysisSchema.safeParse({ questions: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing questions', () => {
    const result = queryAnalysisSchema.safeParse({ is_clear: true });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean is_clear', () => {
    const result = queryAnalysisSchema.safeParse({ is_clear: 'yes', questions: [] });
    expect(result.success).toBe(false);
  });

  it('rejects non-array questions', () => {
    const result = queryAnalysisSchema.safeParse({ is_clear: true, questions: 'what?' });
    expect(result.success).toBe(false);
  });
});
