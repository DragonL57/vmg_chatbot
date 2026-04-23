import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    POE_API_KEY: z.string().min(1),
    POE_BOT_NAME: z.string().min(1).default('grok-4.1-fast-non-reasoning'),
    POE_REASONING_MODEL: z.string().min(1).default('grok-4.1-fast-reasoning'),
    LLM_PROVIDER: z.enum(['poe', 'inception']).default('poe'),
    INCEPTION_API_KEY: z.string().default(''),
    INCEPTION_MODEL: z.string().default('mercury-2'),
    INCEPTION_MODEL_EFFORT: z.enum(['instant', 'low', 'medium', 'high']).default('instant'),
    INCEPTION_REASONING_MODEL: z.string().default('mercury-2'),
    INCEPTION_REASONING_EFFORT: z.enum(['instant', 'low', 'medium', 'high']).default('medium'),
    INDEXING_PROVIDER: z.enum(['poe', 'inception', 'openai', '']).default(''),
    INDEXING_API_KEY: z.string().default(''),
    INDEXING_BASE_URL: z.string().default(''),
    INDEXING_MODEL: z.string().default(''),
    INDEXING_MODEL_EFFORT: z.string().default(''),
    QDRANT_URL: z.string().min(1),
    QDRANT_API_KEY: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    ADMIN_PASSWORD: z.string().min(1).default('ilovevmg'),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_KEY: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  },
});
