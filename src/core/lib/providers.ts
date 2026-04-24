import { env } from '@/env';
import OpenAI from 'openai';

export interface ProviderResult {
  client: OpenAI;
  model: string;
  reasoningModel?: string;
  extraBody?: any;
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
 * DashScope Provider (Primary for EVERYTHING: Chat, Reasoning, Memory)
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
 * Logic to get the model for indexing/uploading files.
 * Based on the INDEXING_PROVIDER environment variable.
 */
export function getIndexingProvider(): ProviderResult {
  if (env.INDEXING_PROVIDER === 'dashscope' && env.DASHSCOPE_API_KEY) {
    return getDashScopeProvider();
  }
  return getPoeProvider();
}

/**
 * Global Fast Provider (Agentic Steps) -> Always Alibaba
 */
export function getFastProvider(): ProviderResult {
  return getDashScopeProvider();
}

/**
 * Global Generation Provider (Final Answers) -> Always Alibaba
 */
export function getGenerationProvider(): ProviderResult {
  return getDashScopeProvider();
}

/**
 * Sleep-time Provider (Background Memory) -> Always Alibaba
 */
export function getSleepTimeProvider(): ProviderResult {
  return getDashScopeProvider();
}
