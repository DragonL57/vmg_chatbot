import { describe, it, expect } from 'vitest';

describe('LLMProviderAdapter - mapUsage (pure logic)', () => {
  function mapUsage(usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number; cache_creation_input_tokens?: number };
  } | null | undefined) {
    return {
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
      cached_tokens: usage?.prompt_tokens_details?.cached_tokens || 0,
      cache_creation_tokens: usage?.prompt_tokens_details?.cache_creation_input_tokens || 0,
    };
  }

  it('maps full usage data', () => {
    const result = mapUsage({
      prompt_tokens: 100, completion_tokens: 50, total_tokens: 150,
      prompt_tokens_details: { cached_tokens: 20, cache_creation_input_tokens: 5 },
    });
    expect(result).toEqual({
      prompt_tokens: 100, completion_tokens: 50, total_tokens: 150,
      cached_tokens: 20, cache_creation_tokens: 5,
    });
  });

  it('handles null usage', () => {
    expect(mapUsage(null)).toEqual({
      prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
      cached_tokens: 0, cache_creation_tokens: 0,
    });
  });

  it('handles undefined usage', () => {
    expect(mapUsage(undefined)).toEqual({
      prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
      cached_tokens: 0, cache_creation_tokens: 0,
    });
  });

  it('handles missing tokens_details', () => {
    const result = mapUsage({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
    expect(result.cached_tokens).toBe(0);
    expect(result.cache_creation_tokens).toBe(0);
    expect(result.prompt_tokens).toBe(10);
  });
});
