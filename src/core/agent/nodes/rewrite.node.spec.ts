import { describe, it, expect } from 'vitest';

describe('rewriteNode - query expansion parsing', () => {
  /**
   * Tests the pure parsing logic from rewriteNode:
   * let parsed = { queries: [] as string[], reasoning: "" };
   * try { const rawParsed = JSON.parse(output); parsed = { ...parsed, ...rawParsed }; } catch {}
   * return { subQueries: Array.isArray(parsed.queries) && parsed.queries.length > 0 ? parsed.queries : [lastQuery], ... }
   */
  function parseRewriteOutput(output: string, lastQuery: string): string[] {
    let parsed: { queries: string[]; reasoning: string } = { queries: [], reasoning: '' };
    try {
      const rawParsed = JSON.parse(output);
      parsed = { ...parsed, ...rawParsed };
    } catch {
      // Silent fail fallback
    }
    return Array.isArray(parsed.queries) && parsed.queries.length > 0
      ? parsed.queries
      : [lastQuery];
  }

  it('parses valid query expansion JSON', () => {
    const output = JSON.stringify({
      queries: ['VSTEP Mastery program details', 'VSTEP English course structure'],
      reasoning: 'Expanded to cover program structure',
    });
    const result = parseRewriteOutput(output, 'VSTEP là gì');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('VSTEP Mastery program details');
  });

  it('falls back to original query on parse error', () => {
    const result = parseRewriteOutput('not json', 'VSTEP là gì');
    expect(result).toEqual(['VSTEP là gì']);
  });

  it('falls back when queries array is empty', () => {
    const output = JSON.stringify({ queries: [], reasoning: 'No expansion needed' });
    const result = parseRewriteOutput(output, 'Original query');
    expect(result).toEqual(['Original query']);
  });

  it('falls back when queries is not an array', () => {
    const output = JSON.stringify({ queries: 'not-an-array', reasoning: '' });
    const result = parseRewriteOutput(output, 'Original query');
    expect(result).toEqual(['Original query']);
  });

  it('handles missing queries key', () => {
    const output = JSON.stringify({ reasoning: 'Just reasoning' });
    const result = parseRewriteOutput(output, 'Fallback query');
    expect(result).toEqual(['Fallback query']);
  });

  it('handles empty JSON object', () => {
    const output = '{}';
    const result = parseRewriteOutput(output, 'Fallback');
    expect(result).toEqual(['Fallback']);
  });
});
