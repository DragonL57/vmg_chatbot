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
   * Pricing logic based on Qwen-Flash Tiered Model.
   * Range 1 (<= 256K): Input $0.25/1M | Output $1.5/1M
   * Range 2 (> 256K):  Input $1.00/1M | Output $4.00/1M
   * Batch: 50% discount on standard price.
   * Cache Hit: 10% of standard input price.
   * Cache Creation: 125% of standard input price.
   */
  private static calculateCost(model: string, prompt: number, completion: number, cached: number, created: number, isBatch = false): number {
    let inputBase1M = 0.25;
    let outputBase1M = 1.5;

    // Check tiers for qwen3.6-flash
    if (model.includes('qwen3.6-flash') || model.includes('qwen-flash')) {
      if (prompt > 256000) {
        inputBase1M = 1.0;
        outputBase1M = 4.0;
      }
    }

    const batchMultiplier = isBatch ? 0.5 : 1.0;

    const priceStandardInput = (inputBase1M * batchMultiplier) / 1_000_000;
    const priceCacheHit = (inputBase1M * 0.1) / 1_000_000;
    const priceCacheCreation = (inputBase1M * 1.25) / 1_000_000;
    const priceOutput = (outputBase1M * batchMultiplier) / 1_000_000;

    const standardTokens = Math.max(0, prompt - cached - created);

    const inputCost = (cached * priceCacheHit) + (created * priceCacheCreation) + (standardTokens * priceStandardInput);
    const outputCost = completion * priceOutput;

    return inputCost + outputCost;
  }
}
