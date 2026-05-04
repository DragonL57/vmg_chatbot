import { describe, it, expect } from 'vitest';
import type { QueryAnalysis } from './query-analysis';

describe('QueryAnalysis type', () => {
  it('creates a valid clear QueryAnalysis', () => {
    const analysis: QueryAnalysis = {
      is_clear: true,
      questions: ['What is the capital of France?'],
    };
    expect(analysis.is_clear).toBe(true);
    expect(analysis.questions).toHaveLength(1);
    expect(analysis.clarification_needed).toBeUndefined();
  });

  it('creates a valid unclear QueryAnalysis with clarification', () => {
    const analysis: QueryAnalysis = {
      is_clear: false,
      questions: [],
      clarification_needed: 'Could you please specify which country?',
    };
    expect(analysis.is_clear).toBe(false);
    expect(analysis.clarification_needed).toBeDefined();
    expect(analysis.clarification_needed).toContain('specify');
  });
});
