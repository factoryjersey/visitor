/**
 * Which paths need a signed-in user: the editing side under /admin.
 * Everything else is the public site, or the sign-in flow itself.
 * Its own module so it can be tested — a protected path that slips out
 * of this rule is public, so the rule is a prefix, not a list.
 *
 * Runs in the edge runtime, so no Node APIs in here.
 */
export function isProtectedPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
