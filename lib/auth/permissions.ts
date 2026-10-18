/**
 * Whether an address may sign in. Supabase will authenticate any Google
 * account, so the domain is checked by us, after the fact.
 *
 * Edge-safe: middleware calls it too.
 */
export function isEmailDomainAllowed(email: string, allowedRaw: string | undefined): boolean {
  if (!allowedRaw || !allowedRaw.trim()) return true; // no restriction configured
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  return allowedRaw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .includes(domain);
}

/** Only same-origin relative paths: a crafted `next` must not redirect off-site. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
