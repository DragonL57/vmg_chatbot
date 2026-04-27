import { env } from '@/env';
import OpenAI from 'openai';

export type ReasoningEffort = 'instant' | 'low' | 'medium' | 'high';

export interface ProviderResult {
  client: OpenAI;
  model: string;
  reasoningModel?: string;
  extraBody?: any;
  isBatch?: boolean;
}

/**
 * Poe Provider (Fallback/Indexing)
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
 * Inception Labs Provider (Primary Reasoning Engine)
 * Supports Mercury 2 and reasoning_effort control.
 */
export function getInceptionProvider(effort: ReasoningEffort = 'medium'): ProviderResult {
  const client = new OpenAI({
    apiKey: env.INCEPTION_API_KEY || '',
    baseURL: 'https://api.inceptionlabs.ai/v1',
  });
  return {
    client,
    model: env.INCEPTION_MODEL,
    extraBody: {
      reasoning_effort: effort,
      reasoning_summary: true
    }
  };
}

/**
 * Logic to get the model for indexing/uploading files.
 */
export function getIndexingProvider(): ProviderResult {
  if (env.INDEXING_PROVIDER === 'inception' && env.INCEPTION_API_KEY) {
    return getInceptionProvider('low');
  }
  return getPoeProvider();
}

/**
 * Global Fast Provider (Agentic Steps: Router, Grader, Rewriter)
 * Using 'instant' effort for maximum speed.
 */
export function getFastProvider(): ProviderResult {
  if (env.INCEPTION_API_KEY) return getInceptionProvider('instant');
  return getPoeProvider();
}

/**
 * Global Generation Provider (Final Answers)
 * Using 'high' effort for maximum quality and synthesis.
 */
export function getGenerationProvider(): ProviderResult {
  if (env.INCEPTION_API_KEY) return getInceptionProvider('high');
  return getPoeProvider();
}

/**
 * Sleep-time Provider (Background Memory Reconciliation)
 * Using 'high' effort as accuracy is more important than speed.
 */
export function getSleepTimeProvider(): ProviderResult {
  if (env.INCEPTION_API_KEY) return getInceptionProvider('high');
  return getPoeProvider();
}
