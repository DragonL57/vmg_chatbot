import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    POE_API_KEY: z.string().min(1),
    POE_BOT_NAME: z.string().min(1).default('grok-4.1-fast-non-reasoning'),
    POE_REASONING_MODEL: z.string().min(1).default('grok-4.1-fast-reasoning'),
    
    // DashScope (Qwen) configuration
    DASHSCOPE_API_KEY: z.string().optional(),
    DASHSCOPE_MODEL: z.string().default('qwen-plus'),
    
    LLM_PROVIDER: z.enum(['poe', 'dashscope']).default('poe'),
    INDEXING_PROVIDER: z.enum(['poe', 'dashscope']).default('poe'),
    
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
