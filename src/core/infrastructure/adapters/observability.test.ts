import { describe, it, expect, vi } from 'vitest';
import { DrizzleObservabilityAdapter } from './drizzle-observability.adapter';
import { db } from '../../db';

vi.mock('../../db', () => {
  const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) });
  const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'test-trace-id' }]) });
  const mockWhere = vi.fn().mockResolvedValue([
    { promptTokens: 10, completionTokens: 5, costUsd: '0.0001', latencyMs: 100 },
    { promptTokens: 20, completionTokens: 10, costUsd: '0.0002', latencyMs: 200 },
  ]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

  return {
    db: {
      insert: vi.fn().mockReturnValue({ values: mockValues }),
      select: vi.fn().mockReturnValue({ from: mockFrom }),
      update: vi.fn().mockReturnValue({ set: mockSet }),
    },
  };
});

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

    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('should finalize a trace by aggregating spans', async () => {
    await adapter.finalizeTrace('test-trace-id');

    expect(db.select).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });

  it('should calculate cost correctly (standard path)', () => {
    const calc = (adapter as unknown as { calculateCost: (m: string, p: number, c: number, ca: number, cr: number) => number }).calculateCost.bind(adapter);
    const cost = calc('gpt-4o', 1000, 500, 0, 0);
    expect(cost).toBeCloseTo(0.000625, 8);
  });

  it('should calculate cost correctly with cache hits', () => {
    const calc = (adapter as unknown as { calculateCost: (m: string, p: number, c: number, ca: number, cr: number) => number }).calculateCost.bind(adapter);
    const cost = calc('gpt-4o', 1000, 500, 800, 0);
    expect(cost).toBeCloseTo(0.000445, 8);
  });
});
