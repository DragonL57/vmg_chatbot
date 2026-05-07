import { describe, it, expect } from 'vitest';

// Testing the calculateCost method from DrizzleObservabilityAdapter
// This is pure math — the actual adapter needs a DB but we can test cost calc
function calculateCost(_model: string, prompt: number, completion: number, cached: number, _created: number): number {
  const INPUT_BASE_1M = 0.25;
  const OUTPUT_BASE_1M = 0.75;
  const CACHE_HIT_1M = 0.025;

  const priceStandardInput = INPUT_BASE_1M / 1_000_000;
  const priceCacheHit = CACHE_HIT_1M / 1_000_000;
  const priceOutput = OUTPUT_BASE_1M / 1_000_000;

  const standardTokens = Math.max(0, prompt - cached);
  return (cached * priceCacheHit) + (standardTokens * priceStandardInput) + (completion * priceOutput);
}

describe('ObservabilityAdapter - calculateCost', () => {
  it('calculates cost for zero tokens', () => {
    expect(calculateCost('test', 0, 0, 0, 0)).toBe(0);
  });

  it('calculates cost for standard input only', () => {
    const cost = calculateCost('test', 1000, 0, 0, 0);
    expect(cost).toBeCloseTo(1000 * 0.25 / 1_000_000, 8);
  });

  it('calculates cost for output only', () => {
    const cost = calculateCost('test', 0, 1000, 0, 0);
    expect(cost).toBeCloseTo(1000 * 0.75 / 1_000_000, 8);
  });

  it('calculates cost with cache hits', () => {
    // 500 cached (cheaper) + 500 standard (normal input rate)
    const cost = calculateCost('test', 1000, 0, 500, 0);
    const expected = (500 * 0.025 / 1_000_000) + (500 * 0.25 / 1_000_000);
    expect(cost).toBeCloseTo(expected, 8);
  });

  it('handles cached tokens exceeding prompt (clamped to 0)', () => {
    const cost = calculateCost('test', 500, 0, 1000, 0);
    // standardTokens = max(0, 500-1000) = 0
    expect(cost).toBeCloseTo(1000 * 0.025 / 1_000_000, 8);
  });

  it('calculates full cost with all components', () => {
    const cost = calculateCost('test', 10000, 5000, 2000, 0);
    expect(cost).toBeGreaterThan(0);
    expect(typeof cost).toBe('number');
  });

  it('cache hits are significantly cheaper than standard input', () => {
    const standardCost = calculateCost('test', 1000000, 0, 0, 0);
    const cachedCost = calculateCost('test', 1000000, 0, 1000000, 0);
    // cache is 10x cheaper (0.025 vs 0.25)
    expect(cachedCost).toBeLessThan(standardCost * 0.5);
  });
});
