import { env } from '@/env';
import OpenAI from 'openai';

export type ReasoningEffort = 'instant' | 'low' | 'medium' | 'high';

export interface ProviderResult {
  client: OpenAI;
  model: string;
  reasoningModel?: string;
  extraBody?: Record<string, unknown>;
  isBatch?: boolean;
}

/**
 * Poe Provider (Fallback)
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
 * Global Generation Provider (Final Answers)
 * Using 'high' effort for maximum quality and synthesis.
 */
export function getGenerationProvider(): ProviderResult {
  if (env.INCEPTION_API_KEY) return getInceptionProvider('high');
  return getPoeProvider();
}
