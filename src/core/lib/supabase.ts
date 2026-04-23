import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/env';

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_KEY;

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
