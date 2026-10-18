import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isProtectedPath } from '@/lib/auth/public-paths';

/**
 * Refreshes the Supabase session and sends anyone under /admin or
 * /account who is not signed in to /login. The public site needs no
 * session. Whether the person has an account here, and which role, is
 * checked by the pages: this runs at the edge, without the database.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Admin pages read the session; a cached one can show the wrong state.
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}

// Only the editing side, a provider's pages and the sign-in flow need the session. The public
// site skips middleware entirely, so it can be cached.
export const config = {
  matcher: ['/admin/:path*', '/admin', '/account/:path*', '/account', '/login/:path*', '/login', '/logout', '/auth/:path*', '/invite/:path*'],
};
