import { describe, it, expect } from 'vitest';
import { hierarchicalChunk } from './chunking.service';

describe('hierarchicalChunk', () => {
  it('should split markdown into parent and child chunks', () => {
    const markdown = `
# Header 1
This is a long section of text that should be treated as a parent.
It needs to be long enough to exceed the MIN_PARENT_SIZE if possible, 
but for testing the structure, we can use a smaller string and see how it behaves.

## Header 2
Another section here. This one is under a different header.
    `;
    
    const results = hierarchicalChunk(markdown);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('child');
    expect(results[0]).toHaveProperty('parent');
    expect(results[0]).toHaveProperty('header');
  });

  it('should handle small markdown files', () => {
    const markdown = 'Just a small piece of text.';
    const results = hierarchicalChunk(markdown);
    expect(results.length).toBe(1);
    expect(results[0].header).toBe('General');
  });

  it('should preserve headers in child chunks', () => {
    const markdown = '# Section Title\nContent here.';
    const results = hierarchicalChunk(markdown);
    expect(results[0].child).toContain('[Section Title]');
  });
});
