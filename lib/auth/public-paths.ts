/**
 * Which paths need a signed-in user: the editing side under /admin and a
 * provider's own pages under /account. Everything else is the public
 * site, or the sign-in flow itself. Its own module so it can be tested —
 * a protected path that slips out of this rule is public, so the rule is
 * a prefix, not a list. Which role may see what is checked by the pages
 * themselves; middleware runs at the edge and cannot read the database.
 *
 * Runs in the edge runtime, so no Node APIs in here.
 */
export function isProtectedPath(pathname: string): boolean {
  return ['/admin', '/account'].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
