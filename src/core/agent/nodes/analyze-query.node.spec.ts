import { describe, it, expect } from 'vitest';
import { queryAnalysisSchema } from '../../application/schemas/query-analysis-schema';

// Testing the parseResult function logic from analyze-query.node.ts
function parseResult(content: string | null, fallback: string) {
  try {
    const raw = JSON.parse(content || '{}');
    const result = queryAnalysisSchema.safeParse(raw);
    return result.success ? result.data : { is_clear: true, questions: [fallback] };
  } catch { return { is_clear: true, questions: [fallback] }; }
}

describe('analyzeQueryNode - parseResult', () => {
  it('parses valid query analysis JSON', () => {
    const result = parseResult(
      JSON.stringify({ is_clear: true, questions: ['What is VSTEP?'] }),
      'fallback'
    );
    expect(result.is_clear).toBe(true);
    expect(result.questions).toEqual(['What is VSTEP?']);
  });

  it('parses unclear query with clarification', () => {
    const result = parseResult(
      JSON.stringify({ is_clear: false, questions: [], clarification_needed: 'Please specify.' }),
      'fallback'
    );
    expect(result.is_clear).toBe(false);
    expect(result.clarification_needed).toBe('Please specify.');
  });

  it('falls back on JSON parse error', () => {
    const result = parseResult('not json', 'original query');
    expect(result.is_clear).toBe(true);
    expect(result.questions).toEqual(['original query']);
  });

  it('falls back on null content', () => {
    const result = parseResult(null, 'original query');
    expect(result.is_clear).toBe(true);
    expect(result.questions).toEqual(['original query']);
  });

  it('falls back on schema validation failure', () => {
    const result = parseResult(JSON.stringify({ is_clear: 'not-a-boolean' }), 'fallback');
    expect(result.is_clear).toBe(true);
    expect(result.questions).toEqual(['fallback']);
  });

  it('handles empty JSON object', () => {
    const result = parseResult('{}', 'fallback');
    expect(result.is_clear).toBe(true);
    expect(result.questions).toEqual(['fallback']);
  });
});
