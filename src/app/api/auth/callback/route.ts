import { createServerSupabase } from '@/core/lib/supabase-server';
import { NextResponse } from 'next/server';
import { DrizzleAuthRepositoryAdapter } from '@core/infrastructure/adapters';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const authRepo = new DrizzleAuthRepositoryAdapter();
      await authRepo.getOrCreateUser({
        supabaseId: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url
      });
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}
