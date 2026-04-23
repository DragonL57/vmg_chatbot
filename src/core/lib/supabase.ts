import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

// Ensure only one instance of Supabase Client exists (Singleton)
const globalSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient>;
};

export const supabase = globalSupabase.supabase || createClient(supabaseUrl, supabaseKey);

if (process.env.NODE_ENV !== 'production') {
  globalSupabase.supabase = supabase;
}
