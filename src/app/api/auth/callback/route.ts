import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { getOrCreateUser } from '@/core/services/auth.service';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[Auth Callback] Session exchange error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data?.user) {
      try {
        await getOrCreateUser(data.user);
        return NextResponse.redirect(`${origin}${next}`);
      } catch (err: any) {
        console.error('[Auth Callback] User sync error:', err.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message)}`);
      }
    }
  }

  console.error('[Auth Callback] No code found in URL');
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
}
