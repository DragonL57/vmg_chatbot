import { env } from '@/env';
import OpenAI from 'openai';

export type ReasoningEffort = 'instant' | 'low' | 'medium' | 'high';

export interface ProviderResult {
  client: OpenAI;
  model: string;
  extraBody?: Record<string, unknown>;
}

export function getInceptionProvider(effort: ReasoningEffort = 'medium'): ProviderResult {
  const client = new OpenAI({
    apiKey: env.INCEPTION_API_KEY || '',
    baseURL: 'https://api.inceptionlabs.ai/v1',
  });
  return {
    client,
    model: env.INCEPTION_MODEL,
    extraBody: { reasoning_effort: effort, reasoning_summary: true },
  };
}

export function getGenerationProvider(): ProviderResult {
  return getInceptionProvider('high');
}
