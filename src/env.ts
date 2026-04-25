import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    POE_API_KEY: z.string().min(1),
    POE_BOT_NAME: z.string().min(1).default('grok-4.1-fast-non-reasoning'),
    POE_REASONING_MODEL: z.string().min(1).default('grok-4.1-fast-reasoning'),
    
    // Inception Labs configuration
    INCEPTION_API_KEY: z.string().optional(),
    INCEPTION_MODEL: z.string().default('mercury-2'),
    
    LLM_PROVIDER: z.enum(['poe', 'inception']).default('inception'),
    INDEXING_PROVIDER: z.enum(['poe', 'inception']).default('inception'),
    
    QDRANT_URL: z.string().min(1),
    QDRANT_API_KEY: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  },
});
