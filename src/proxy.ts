import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const isAuthPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/api/auth');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // For internal API routes, we skip the middleware auth check
  // because the Route Handlers call getUser() themselves. 
  // This saves 1 network trip per API call.
  if (isApiRoute && !isAuthCallback) {
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 1. If no user and not on an auth page, redirect to login
  if (!user && !isAuthPage && !isAuthCallback) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Domain Restriction: Only @vmg.edu.vn emails
  if (user && !user.email?.endsWith('@vmg.edu.vn')) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=Only @vmg.edu.vn emails are allowed', request.url));
  }

  // 3. Redirect logged in users away from login page
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
