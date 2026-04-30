import { describe, it, expect, vi } from 'vitest';
import { DrizzleObservabilityAdapter } from './drizzle-observability.adapter';
import { db } from '../../db';

vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-trace-id' }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { promptTokens: 10, completionTokens: 5, costUsd: '0.0001', latencyMs: 100 },
          { promptTokens: 20, completionTokens: 10, costUsd: '0.0002', latencyMs: 200 },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

describe('DrizzleObservabilityAdapter', () => {
  const adapter = new DrizzleObservabilityAdapter();

  it('should start a trace and return an ID', async () => {
    const id = await adapter.startTrace('user-1', 'conv-1');
    expect(id).toBe('test-trace-id');
    expect(db.insert).toHaveBeenCalled();
  });

  it('should emit a span with calculated cost', async () => {
    await adapter.emitSpan('test-trace-id', {
      nodeName: 'test-node',
      model: 'gpt-4o',
      input: { text: 'hi' },
      output: 'hello',
      promptTokens: 100,
      completionTokens: 50,
      cachedTokens: 0,
      cacheCreationTokens: 0,
      latencyMs: 123,
    });

    expect(db.insert).toHaveBeenCalledTimes(2); // One for startTrace, one for emitSpan
  });

  it('should finalize a trace by aggregating spans', async () => {
    await adapter.finalizeTrace('test-trace-id');
    
    expect(db.select).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
    
    expect(db.update().set).toHaveBeenCalledWith({
      totalTokens: 45,
      totalCostUsd: '0.000300',
      latencyMs: 300,
      error: null,
    });
  });

  it('should calculate cost correctly (standard path)', () => {
    // 1000 prompt, 500 completion
    // priceStandardInput = 0.25 / 1M = 0.00000025
    // priceOutput = 0.75 / 1M = 0.00000075
    // cost = (1000 * 0.00000025) + (500 * 0.00000075)
    // cost = 0.00025 + 0.000375 = 0.000625
    
    const cost = (adapter as unknown as { calculateCost: (m: string, p: number, c: number, ca: number, cr: number) => number }).calculateCost('gpt-4o', 1000, 500, 0, 0);
    expect(cost).toBeCloseTo(0.000625, 8);
  });

  it('should calculate cost correctly with cache hits', () => {
    // 1000 prompt (800 cached, 200 standard), 500 completion
    // CACHE_HIT_1M = 0.025 / 1M = 0.000000025
    // cost = (800 * 0.000000025) + (200 * 0.00000025) + (500 * 0.00000075)
    // cost = 0.00002 + 0.00005 + 0.000375 = 0.000445
    
    const cost = (adapter as unknown as { calculateCost: (m: string, p: number, c: number, ca: number, cr: number) => number }).calculateCost('gpt-4o', 1000, 500, 800, 0);
    expect(cost).toBeCloseTo(0.000445, 8);
  });
});
