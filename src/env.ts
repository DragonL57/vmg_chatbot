import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Inception Labs configuration
    INCEPTION_API_KEY: z.string().min(1),
    INCEPTION_MODEL: z.string().default('mercury-2'),
    
    SUPABASE_URL: z.string().url(),
    SUPABASE_KEY: z.string().min(1),
    SUPABASE_SERVICE_KEY: z.string().min(1),
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
