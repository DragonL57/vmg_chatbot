import { env } from '@/env';
import OpenAI from 'openai';

export interface ProviderResult {
  client: OpenAI;
  model: string;
  reasoningModel?: string;
  extraBody?: any;
  isBatch?: boolean;
}

/**
 * Poe Provider (Available for Indexing)
 */
export function getPoeProvider(): ProviderResult {
  const client = new OpenAI({
    apiKey: env.POE_API_KEY,
    baseURL: 'https://api.poe.com/v1',
  });
  return { 
    client, 
    model: env.POE_BOT_NAME,
    reasoningModel: env.POE_REASONING_MODEL 
  };
}

/**
 * DashScope Provider (Primary for Real-time: Chat, Reasoning)
 * Supports Context Caching (90% Savings)
 */
export function getDashScopeProvider(): ProviderResult {
  const client = new OpenAI({
    apiKey: env.DASHSCOPE_API_KEY || '',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  });
  return {
    client,
    model: env.DASHSCOPE_MODEL,
  };
}

/**
 * DashScope Batch Provider (Background: Memory, Long-running tasks)
 * Synchronous waiting but 50% flat cost reduction. No caching support.
 */
export function getBatchProvider(): ProviderResult {
  const client = new OpenAI({
    apiKey: env.DASHSCOPE_API_KEY || '',
    baseURL: 'https://batch.dashscope.aliyuncs.com/compatible-mode/v1',
    timeout: 1800000, // 30 minute default timeout
  });
  return {
    client,
    model: env.DASHSCOPE_MODEL,
    isBatch: true,
  };
}

/**
 * Logic to get the model for indexing/uploading files.
 */
export function getIndexingProvider(): ProviderResult {
  if (env.INDEXING_PROVIDER === 'dashscope' && env.DASHSCOPE_API_KEY) {
    return getDashScopeProvider();
  }
  return getPoeProvider();
}

/**
 * Global Fast Provider (Agentic Steps in reasoning loop)
 * MUST be real-time for UX.
 */
export function getFastProvider(): ProviderResult {
  return getDashScopeProvider();
}

/**
 * Global Generation Provider (Final Answers)
 * MUST be real-time for UX.
 */
export function getGenerationProvider(): ProviderResult {
  return getDashScopeProvider();
}

/**
 * Sleep-time Provider (Background Memory Reconciliation)
 * Best suited for BATCH to save 50% cost.
 */
export function getSleepTimeProvider(): ProviderResult {
  return getBatchProvider();
}
