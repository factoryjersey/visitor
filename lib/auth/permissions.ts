/** Whether an address is in a comma-separated list, case-insensitively. */
export function isEmailListed(email: string, listRaw: string | undefined): boolean {
  if (!listRaw) return false;
  const e = email.trim().toLowerCase();
  return listRaw
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(e);
}

/** Only same-origin relative paths: a crafted `next` must not redirect off-site. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
