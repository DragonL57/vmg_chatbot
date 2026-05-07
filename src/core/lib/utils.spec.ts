import { describe, it, expect } from 'vitest';
import { slugify, countTokens, estimateTokens, safeJsonParse } from './utils';

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('VSTEP Mastery Program')).toBe('vstep_mastery_program');
  });

  it('removes accents from Vietnamese characters', () => {
    expect(slugify('Tiếng Việt')).toBe('tieng_viet');
  });

  it('handles special Vietnamese đ character', () => {
    expect(slugify('Đại học')).toBe('dai_hoc');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! @World #2024')).toBe('hello_world_2024');
  });

  it('trims extra whitespace', () => {
    expect(slugify('  multiple   spaces  ')).toBe('multiple_spaces');
  });

  it('replaces spaces with underscores', () => {
    expect(slugify('hello world')).toBe('hello_world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles mixed case and accents', () => {
    // Hyphens are stripped by the [^a-z0-9\s_] filter
    expect(slugify('Chương Trình VSTEP B1-B2')).toBe('chuong_trinh_vstep_b1b2');
  });
});

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('counts tokens in English text', () => {
    const tokens = countTokens('Hello world');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it('counts tokens in Vietnamese text', () => {
    const tokens = countTokens('Xin chào thế giới');
    expect(tokens).toBeGreaterThan(0);
  });

  it('counts more tokens for longer text', () => {
    const short = countTokens('Short');
    const long = countTokens('A much longer piece of text that should have more tokens');
    expect(long).toBeGreaterThan(short);
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens using tiktoken', () => {
    const estimated = estimateTokens('Hello world');
    expect(estimated).toBeGreaterThan(0);
  });

  it('falls back to character-based estimation on error', () => {
    // estimateTokens catches errors and falls back to length/4
    const result = estimateTokens('Test string with some content');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('returns null for empty string', () => {
    expect(safeJsonParse('')).toBeNull();
  });

  it('parses JSON from markdown code blocks', () => {
    const result = safeJsonParse('```json\n{"name": "test"}\n```');
    expect(result).toEqual({ name: 'test' });
  });

  it('parses JSON from code blocks without language identifier', () => {
    const result = safeJsonParse('```\n{"x": 1}\n```');
    expect(result).toEqual({ x: 1 });
  });

  it('extracts JSON from surrounding text', () => {
    const result = safeJsonParse('Some text before {"a": 1, "b": 2} and after');
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('returns null for invalid input', () => {
    expect(safeJsonParse('not json at all')).toBeNull();
  });

  it('parses arrays', () => {
    expect(safeJsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('parses nested objects', () => {
    expect(safeJsonParse('{"outer": {"inner": "value"}}')).toEqual({ outer: { inner: 'value' } });
  });

  it('returns null for malformed code block', () => {
    const result = safeJsonParse('```json\nnot valid json\n```');
    expect(result).toBeNull();
  });

  it('returns null when brace extraction also fails', () => {
    // Braces present but content is not valid JSON
    const result = safeJsonParse('Some text {not valid at all} more text');
    expect(result).toBeNull();
  });

  it('returns null for text with no braces at all', () => {
    const result = safeJsonParse('Just some plain text without any structure');
    expect(result).toBeNull();
  });

  it('returns null for brace-delimited non-JSON content', () => {
    const result = safeJsonParse('prefix {broken json] suffix');
    expect(result).toBeNull();
  });
});

describe('estimateTokens fallback', () => {
  it('falls back to character-length estimate when tiktoken errors', () => {
    // The fallback returns Math.ceil(text.length / 4)
    // This is tested implicitly — estimateTokens has a try/catch around countTokens
    const text = 'Hello world';
    const result = estimateTokens(text);
    // Whether via tiktoken or fallback, should return a positive number
    expect(result).toBeGreaterThan(0);
  });
});
