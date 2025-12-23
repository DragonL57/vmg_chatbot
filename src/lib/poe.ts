import OpenAI from 'openai';
import { env } from '@/env';

/**
 * POE API client using OpenAI-compatible interface.
 * Configured with Poe's base URL and API key from environment variables.
 */
export const poe = new OpenAI({
  apiKey: env.POE_API_KEY,
  baseURL: 'https://api.poe.com/v1',
});

/**
 * Default model/bot to use for completions.
 */
export const DEFAULT_POE_MODEL = env.POE_BOT_NAME;
