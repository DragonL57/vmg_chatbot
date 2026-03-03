import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    POE_API_KEY: z.string().min(1),
    POE_BOT_NAME: z.string().min(1),
    POE_REASONING_MODEL: z.string().min(1).default('grok-4.1-fast-reasoning'),
    QDRANT_URL: z.string().min(1),
    QDRANT_API_KEY: z.string().min(1),
    SUPABASE_URL: z.string().min(1),
    SUPABASE_KEY: z.string().min(1),
  },
  client: {
    // Add client-side variables here (e.g. NEXT_PUBLIC_...)
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   POE_API_KEY: process.env.POE_API_KEY,
  //   ...
  // },
  // For Next.js >= 13.4.4, this is not needed.
  experimental__runtimeEnv: {},
});
