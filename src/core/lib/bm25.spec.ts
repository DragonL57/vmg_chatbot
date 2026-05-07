import { describe, it, expect } from 'vitest';
import { bm25Search, reciprocalRankFusion } from './bm25';

describe('bm25Search', () => {
  const shortDoc = { id: '1', text: 'VSTEP Mastery Program for English learners' };
  const longDoc = { id: '2', text: 'IELTS preparation course covering all four skills: listening, reading, writing, and speaking' };
  const unrelatedDoc = { id: '3', text: 'Cooking recipes for Vietnamese cuisine' };

  it('returns empty array for empty docs list', () => {
    expect(bm25Search('VSTEP', [])).toEqual([]);
  });

  it('returns empty array for empty query', () => {
    const result = bm25Search('', [shortDoc]);
    // Tokenize removes empty tokens, query becomes empty
    expect(result).toEqual([]);
  });

  it('returns empty array for whitespace-only query', () => {
    const result = bm25Search('   ', [shortDoc]);
    expect(result).toEqual([]);
  });

  it('ranks documents by relevance to query', () => {
    const docs = [unrelatedDoc, longDoc, shortDoc];
    const result = bm25Search('VSTEP', docs, 3);

    expect(result.length).toBeGreaterThan(0);
    // VSTEP document should rank highest
    expect(result[0].id).toBe('1');
    expect(result[0].score).toBeGreaterThan(0);
  });

  it('returns at most topK results', () => {
    const docs = [shortDoc, longDoc, unrelatedDoc];
    const result = bm25Search('English', docs, 2);

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('scores are higher for more relevant documents', () => {
    const docs = [shortDoc, longDoc];
    const result = bm25Search('VSTEP', docs, 3);

    expect(result[0].id).toBe('1');
    if (result.length > 1) {
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    }
  });

  it('handles multi-word queries', () => {
    const docs = [longDoc, shortDoc];
    const result = bm25Search('IELTS preparation course', docs, 3);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('2');
  });

  it('handles Vietnamese text', () => {
    const docs = [
      { id: '1', text: 'Chương trình VSTEP Mastery dành cho người mất gốc tiếng Anh' },
      { id: '2', text: 'Khóa học IELTS cấp tốc trong 3 tháng' },
    ];
    const result = bm25Search('VSTEP', docs, 3);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('1');
  });

  it('returns empty for query with no matching terms', () => {
    const docs = [shortDoc, longDoc];
    const result = bm25Search('TOEFL', docs, 3);

    expect(result).toEqual([]);
  });

  it('handles single document corpus', () => {
    const result = bm25Search('VSTEP', [shortDoc], 5);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('reciprocalRankFusion', () => {
  it('returns unique sorted IDs from multiple ranked lists', () => {
    const list1 = ['a', 'b', 'c'];
    const list2 = ['b', 'c', 'd'];

    const result = reciprocalRankFusion([list1, list2]);
    expect(result.length).toBe(4);
    expect(result[0]).toBe('b'); // b appears high in both lists
  });

  it('handles single ranked list', () => {
    const result = reciprocalRankFusion([['x', 'y', 'z']]);
    expect(result).toEqual(['x', 'y', 'z']);
  });

  it('handles empty input', () => {
    const result = reciprocalRankFusion([]);
    expect(result).toEqual([]);
  });

  it('handles lists with empty arrays', () => {
    const result = reciprocalRankFusion([['a', 'b'], []]);
    expect(result).toEqual(['a', 'b']);
  });

  it('uses configurable k parameter', () => {
    const list1 = ['a', 'b', 'c'];
    const list2 = ['c', 'b', 'a'];

    const defaultK = reciprocalRankFusion([list1, list2]);
    const highK = reciprocalRankFusion([list1, list2], 100);

    // Higher k reduces rank discrimination, so orders may differ
    expect(defaultK.length).toBe(highK.length);
  });

  it('deduplicates across lists', () => {
    const list1 = ['a', 'a', 'b'];
    const list2 = ['b', 'b', 'a'];

    const result = reciprocalRankFusion([list1, list2]);
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });
});
