import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isProtectedPath } from '@/lib/auth/public-paths';

const SESSION_PATHS = /^\/(admin|account|login|logout|auth|invite)(\/|$)/;

/** Pages with a Markdown version: the public site's sections and listings. */
const MARKDOWN_PATHS = /^\/($|whats-on(\/[^/]+)?$|tours(\/[^/]+)?$|venues(\/[^/]+)?$|organisers(\/[^/]+)?$|list$)/;

/** Asked for Markdown before HTML: an agent, not a browser. */
const wantsMarkdown = (accept: string | null) => {
  if (!accept) return false;
  const q = (type: string) => {
    const part = accept.split(',').map((p) => p.trim()).find((p) => p.split(';')[0] === type);
    if (!part) return -1;
    const m = /;\s*q=([\d.]+)/.exec(part);
    return m ? Number(m[1]) : 1;
  };
  return q('text/markdown') > Math.max(q('text/html'), -0.5);
};

/**
 * The public site for agents: /whats-on/x.md, or /whats-on/x asked
 * for as text/markdown, is the Markdown version; every HTML page says
 * where its Markdown is, in a Link header. No session, no database.
 */
function forAgents(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const asMd = path.endsWith('.md') ? (path === '/index.md' ? '/' : path.slice(0, -3)) : null;
  const page = asMd ?? path;
  if (!MARKDOWN_PATHS.test(page)) return NextResponse.next();
  if (asMd !== null || wantsMarkdown(request.headers.get('accept'))) {
    const url = request.nextUrl.clone();
    url.pathname = `/md${page === '/' ? '' : page}`;
    return NextResponse.rewrite(url);
  }
  const response = NextResponse.next();
  response.headers.set('Link', `<${page === '/' ? '/index' : page}.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"; type="text/markdown", </openapi.json>; rel="service-desc"; type="application/json"`);
  response.headers.set('Vary', 'Accept');
  return response;
}

/**
 * Refreshes the Supabase session and sends anyone under /admin or
 * /account who is not signed in to /login. The public site needs no
 * session. Whether the person has an account here, and which role, is
 * checked by the pages: this runs at the edge, without the database.
 */
export async function middleware(request: NextRequest) {
  if (!SESSION_PATHS.test(request.nextUrl.pathname)) return forAgents(request);
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

// Only the editing side, a provider's pages and the sign-in flow need the session; the public
// pages pass through forAgents above. Assets, the API and the agent files skip middleware.
export const config = {
  matcher: ['/((?!_next/|api/|md/|mcp|\\.well-known/|favicon|guide/|.*\\.(?:svg|png|jpe?g|webp|ico|css|js|txt|xml|json)$).*)'],
};
