/**
 * Which paths skip the signed-in check: only the sign-in flow itself.
 * Its own module so it can be tested — a path wrongly missing from it
 * fails as a quiet redirect to /login, and one wrongly on it is public.
 *
 * Runs in the edge runtime, so no Node APIs in here.
 */
export const PUBLIC_PATHS = ['/login', '/logout', '/auth/callback'] as const;

/** Exact match, or a segment beneath one: `/login/x` yes, `/loginx` no. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
