import { describe, it, expect } from 'vitest';
import { hierarchicalChunk } from './chunking.service';

describe('hierarchicalChunk with empty or short input', () => {
  it('returns empty array for empty input', () => {
    expect(hierarchicalChunk('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(hierarchicalChunk('   \n\n  ')).toEqual([]);
  });

  it('produces no children for very short text', () => {
    expect(hierarchicalChunk('# Tiny\nHi.')).toHaveLength(0);
  });
});

describe('hierarchicalChunk content splitting', () => {
  it('chunks a long section into parent-child pairs', () => {
    const result = hierarchicalChunk('# Introduction\n' + 'A'.repeat(2000));
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].header).toBe('Introduction');
    expect(result[0].child).toContain('[Introduction]');
    expect(result[0].child.length).toBeLessThan(600);
  });

  it('produces children with header prefix', () => {
    const result = hierarchicalChunk('# My Header\n' + 'X'.repeat(1500));
    for (const chunk of result) {
      expect(chunk.child).toMatch(/^\[My Header\]/);
    }
  });

  it('handles h2 and h3 headers', () => {
    const result = hierarchicalChunk('## Sub Section\n' + 'Y'.repeat(1500));
    expect(result[0].header).toBe('Sub Section');
  });

  it('produces overlapping children for long text', () => {
    const result = hierarchicalChunk('# Long\n' + 'Hello world. '.repeat(200));
    expect(result.length).toBeGreaterThan(1);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].parent).toBe(result[i - 1].parent);
    }
  });
});

describe('hierarchicalChunk section merging', () => {
  it('merges adjacent short sections into one parent', () => {
    const result = hierarchicalChunk(
      '# Part A\n' + 'B'.repeat(400) + '\n\n# Part B\n' + 'C'.repeat(400)
    );
    expect(result.length).toBeGreaterThan(0);
    const parents = new Set(result.map((c) => c.parent));
    expect(parents.size).toBe(1);
    expect(result[0].parent).toContain('# Part A');
    expect(result[0].parent).toContain('# Part B');
  });

  it('treats long sections as separate parent blocks', () => {
    const result = hierarchicalChunk(
      '# Long A\n' + 'A'.repeat(1400) + '\n\n# Long B\n' + 'B'.repeat(1400)
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    const headers = result.map((c) => c.header);
    expect(headers).toContain('Long A');
    expect(headers).toContain('Long B');
    const parents = [...new Set(result.map((c) => c.parent))];
    expect(parents.length).toBeGreaterThanOrEqual(2);
  });

  it('handles real-world markdown with mixed content', () => {
    const text = [
      '# Course Overview',
      'This course covers advanced topics in English literature.',
      'We will study Shakespeare, Milton, and modern poetry.',
      '',
      '## Week 1: Shakespeare',
      'Shakespeare wrote 37 plays. His most famous works include Hamlet,',
      'Romeo and Juliet, and Macbeth. We will analyze these in depth.',
      '',
      '## Week 2: Milton',
      'John Milton wrote Paradise Lost. This epic poem explores the fall of man.',
      'We will examine its themes and literary devices.',
      '',
      '### Assessment',
      'Students will write a 5000-word essay and take a final exam.',
    ].join('\n');

    const result = hierarchicalChunk(text);
    expect(result.length).toBeGreaterThan(0);
    for (const chunk of result) {
      expect(chunk.child).toMatch(/^\[.+\]/);
      expect(chunk.parent).toBeTruthy();
      expect(chunk.header).toBeTruthy();
    }
  });
});
