/**
 * A cache in the server's memory for what every public page reads: the
 * listings, loaded once and kept for a few minutes, so a page (or a
 * crawler working through hundreds of them) costs the database nothing.
 * The site runs as one Node process, so one copy serves every request.
 * Requests that arrive while it loads wait on the same load, not one each.
 * A failed load is not kept.
 */
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export const LISTINGS_TTL_MS = 10 * 60 * 1000;

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load().catch((e) => {
    if (store.get(key)?.value === value) store.delete(key);
    throw e;
  });
  store.set(key, { at: Date.now(), value });
  return value;
}

/** Drop what is kept under a prefix, so staff see an edit at once rather than in ten minutes. */
export function forget(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
