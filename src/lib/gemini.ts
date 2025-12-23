import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '@/env';

/**
 * Google Generative AI provider for Vercel AI SDK.
 * Configured with the API key from environment variables.
 */
export const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY,
});
