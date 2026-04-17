import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    POE_API_KEY: z.string().min(1),
    POE_BOT_NAME: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string().min(1)),
    POE_REASONING_MODEL: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string().min(1)).default('grok-4.1-fast-reasoning'),
    // Provider selector: 'poe' (default) | 'inception'
    LLM_PROVIDER: z.preprocess(v => String(v ?? '').trim().replace(/^"|"$/g, ''), z.enum(['poe', 'inception'])).default('poe'),
    INCEPTION_API_KEY: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default(''),
    INCEPTION_MODEL: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default('mercury-2'),
    INCEPTION_MODEL_EFFORT: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.enum(['instant', 'low', 'medium', 'high'])).default('instant'),
    INCEPTION_REASONING_MODEL: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default('mercury-2'),
    INCEPTION_REASONING_EFFORT: z.preprocess(v => String(v ?? '').trim().replace(/^"|"$/g, ''), z.enum(['instant', 'low', 'medium', 'high'])).default('medium'),
    // ── Indexing-specific overrides (optional — falls back to LLM_PROVIDER settings) ──
    // Set INDEXING_PROVIDER to use a completely different provider for the indexing pipeline.
    // INDEXING_BASE_URL / INDEXING_API_KEY / INDEXING_MODEL override only the indexing calls.
    INDEXING_PROVIDER: z.preprocess(v => String(v ?? '').trim().replace(/^"|"$/g, ''), z.enum(['poe', 'inception', 'openai', '']).catch('')).default(''),
    INDEXING_API_KEY: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default(''),
    INDEXING_BASE_URL: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default(''),
    INDEXING_MODEL: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default(''),
    INDEXING_MODEL_EFFORT: z.preprocess(v => String(v ?? '').trim().replace(/^\"|\"$/g, ''), z.string()).default(''),
    QDRANT_URL: z.string().min(1),
    QDRANT_API_KEY: z.string().min(1),
    QDRANT_ENV: z.preprocess(v => String(v ?? '').trim(), z.enum(['dev', 'staging', 'prod'])).default('dev'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    },

  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_KEY: z.string().min(1),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // For Next.js >= 13.4.4, this is not needed.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.SUPABASE_KEY,
  },
});
