import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isEmailDomainAllowed } from '@/lib/auth/permissions';
import { isPublicPath } from '@/lib/auth/public-paths';

/**
 * Refreshes the Supabase session on every request and sends anyone not
 * signed in, or signed in from outside the allowed domains, to /login.
 * As factoryOS does; the allowlist is checked here too because a shared
 * Supabase project may hold accounts this app should not admit.
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
  const allowed = !!user?.email && isEmailDomainAllowed(user.email, process.env.ALLOWED_EMAIL_DOMAINS);

  if (!allowed && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Every page reads the session; a cached one can show the wrong state.
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
