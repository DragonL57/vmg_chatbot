import { db } from '../db';
import { agentTraces, agentSpans } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface SpanData {
  nodeName: string;
  model: string;
  input?: any;
  output?: any;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
  latencyMs: number;
  isBatch?: boolean;
}

/**
 * Service for 'Glass Box' Agent Observability and Cost Monitoring.
 */
export class ObservabilityService {
  /**
   * Starts a new trace for a user interaction.
   */
  static async startTrace(userId: string, conversationId: string): Promise<string> {
    const result = await db.insert(agentTraces).values({
      userId,
      conversationId,
    }).returning({ id: agentTraces.id });
    
    return result[0].id;
  }

  /**
   * Records a single step (span) within an agentic reasoning loop.
   */
  static async emitSpan(traceId: string, data: SpanData): Promise<void> {
    const cost = this.calculateCost(
      data.model, 
      data.promptTokens, 
      data.completionTokens, 
      data.cachedTokens,
      data.cacheCreationTokens,
      data.isBatch
    );
    
    await db.insert(agentSpans).values({
      traceId,
      nodeName: data.nodeName,
      model: data.model,
      input: data.input,
      output: data.output,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      cachedTokens: data.cachedTokens,
      cacheCreationTokens: data.cacheCreationTokens,
      costUsd: cost.toFixed(6),
      latencyMs: data.latencyMs,
    });
  }

  /**
   * Finalizes a trace by aggregating all spans and updating the root.
   */
  static async finalizeTrace(traceId: string, error?: string): Promise<void> {
    const spans = await db.select().from(agentSpans).where(eq(agentSpans.traceId, traceId));
    
    const totalTokens = spans.reduce((sum, s) => sum + s.promptTokens + s.completionTokens, 0);
    const totalCost = spans.reduce((sum, s) => sum + parseFloat(s.costUsd), 0);
    const totalLatency = spans.reduce((sum, s) => sum + s.latencyMs, 0);

    await db.update(agentTraces).set({
      totalTokens,
      totalCostUsd: totalCost.toFixed(6),
      latencyMs: totalLatency,
      error: error || null,
    }).where(eq(agentTraces.id, traceId));
  }

  /**
   * Pricing logic based on Inception Mercury 2.
   * Input: $0.25/1M | Output: $0.75/1M | Cache Hit: $0.025/1M
   */
  private static calculateCost(model: string, prompt: number, completion: number, cached: number, created: number, isBatch = false): number {
    const INPUT_BASE_1M = 0.25;
    const OUTPUT_BASE_1M = 0.75;
    const CACHE_HIT_1M = 0.025;

    const priceStandardInput = INPUT_BASE_1M / 1_000_000;
    const priceCacheHit = CACHE_HIT_1M / 1_000_000;
    const priceOutput = OUTPUT_BASE_1M / 1_000_000;

    // Standard tokens = Total prompt - Cached
    const standardTokens = Math.max(0, prompt - cached);

    const inputCost = (cached * priceCacheHit) + (standardTokens * priceStandardInput);
    const outputCost = completion * priceOutput;

    return inputCost + outputCost;
  }
}
