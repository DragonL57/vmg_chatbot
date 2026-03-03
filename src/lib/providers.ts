import OpenAI from 'openai';
import { env } from '@/env';

/**
 * POE provider — OpenAI-compatible, used for both decomposition and (optionally) generation.
 */
export const poeClient = new OpenAI({
  apiKey: env.POE_API_KEY,
  baseURL: 'https://api.poe.com/v1',
});

/**
 * Inception Labs provider — OpenAI-compatible, diffusion-based model.
 * https://docs.inceptionlabs.ai
 */
export const inceptionClient = new OpenAI({
  apiKey: env.INCEPTION_API_KEY ?? '',
  baseURL: 'https://api.inceptionlabs.ai/v1',
});

/**
 * Returns the OpenAI-compatible client + model name to use for Phase 3 generation,
 * based on the LLM_PROVIDER env var.
 *
 * Supported values:
 *   poe        → POE API with POE_REASONING_MODEL  (default)
 *   inception  → Inception Labs with INCEPTION_MODEL
 */
export function getGenerationProvider(): {
  client: OpenAI;
  model: string;
  provider: string;
  extraBody?: Record<string, unknown>;
} {
  const provider = env.LLM_PROVIDER;

  if (provider === 'inception') {
    return {
      client: inceptionClient,
      model: env.INCEPTION_REASONING_MODEL,
      provider: 'inception',
      extraBody: { reasoning_effort: env.INCEPTION_REASONING_EFFORT },
    };
  }

  // Default: poe
  return {
    client: poeClient,
    model: env.POE_REASONING_MODEL,
    provider: 'poe',
  };
}

/**
 * Returns the client + model for fast/cheap calls (decomposition, query reformulation).
 * Respects LLM_PROVIDER: inception → Inception model, poe → POE BOT.
 */
export function getFastProvider(): {
  client: OpenAI;
  model: string;
  provider: string;
  extraBody?: Record<string, unknown>;
} {
  if (env.LLM_PROVIDER === 'inception') {
    return {
      client: inceptionClient,
      model: env.INCEPTION_MODEL,
      provider: 'inception',
      extraBody: { reasoning_effort: env.INCEPTION_MODEL_EFFORT },
    };
  }
  return { client: poeClient, model: env.POE_BOT_NAME, provider: 'poe' };
}

// Re-export poe client + models for backward-compat (indexing.service still uses directly)
export { poeClient as poe };
export const DEFAULT_POE_MODEL = env.POE_BOT_NAME;
export const REASONING_POE_MODEL = env.POE_REASONING_MODEL;
