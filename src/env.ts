import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const trimString = (v: unknown) => String(v ?? '').trim().replace(/^["']|["']$/g, '');

export const env = createEnv({
  server: {
    POE_API_KEY: z.preprocess(trimString, z.string().min(1)),
    POE_BOT_NAME: z.preprocess(trimString, z.string().min(1).default('grok-4.1-fast-non-reasoning')),
    POE_REASONING_MODEL: z.preprocess(trimString, z.string().min(1).default('grok-4.1-fast-reasoning')),
    
    LLM_PROVIDER: z.preprocess(trimString, z.enum(['poe', 'inception'])).default('poe'),
    
    INCEPTION_API_KEY: z.preprocess(trimString, z.string().default('')),
    INCEPTION_MODEL: z.preprocess(trimString, z.string().default('mercury-2')),
    INCEPTION_MODEL_EFFORT: z.preprocess(trimString, z.enum(['instant', 'low', 'medium', 'high'])).default('instant'),
    INCEPTION_REASONING_MODEL: z.preprocess(trimString, z.string().default('mercury-2')),
    INCEPTION_REASONING_EFFORT: z.preprocess(trimString, z.enum(['instant', 'low', 'medium', 'high'])).default('medium'),
    
    INDEXING_PROVIDER: z.preprocess(trimString, z.enum(['poe', 'inception', 'openai', '']).default('')),
    INDEXING_API_KEY: z.preprocess(trimString, z.string().default('')),
    INDEXING_BASE_URL: z.preprocess(trimString, z.string().default('')),
    INDEXING_MODEL: z.preprocess(trimString, z.string().default('')),
    INDEXING_MODEL_EFFORT: z.preprocess(trimString, z.string().default('')),
    
    QDRANT_URL: z.preprocess(trimString, z.string().min(1)),
    QDRANT_API_KEY: z.preprocess(trimString, z.string().min(1)),
    
    SUPABASE_URL: z.preprocess(trimString, z.string().url()),
    SUPABASE_KEY: z.preprocess(trimString, z.string().min(1)),
    DATABASE_URL: z.preprocess(trimString, z.string().min(1)),
  },

  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.preprocess(trimString, z.string().url()),
    NEXT_PUBLIC_SUPABASE_KEY: z.preprocess(trimString, z.string().min(1)),
  },
  
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  },
});
