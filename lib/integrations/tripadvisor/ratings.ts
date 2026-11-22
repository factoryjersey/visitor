import { and, eq, isNotNull, isNull, lt, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { places } from '@/lib/db/schema';
import { env } from '@/lib/env';

/**
 * Each venue's Tripadvisor rating, from Tripadvisor's Content API, by the
 * listing number Visit Jersey gives (places.tripadvisor_id). Refreshed a
 * week at a time: about 300 venues a week keeps well inside the API's free
 * 5,000 calls a month. The page shows it with Tripadvisor's own rating
 * image and a link to their page, as their terms ask.
 *
 * TRIPADVISOR_API_KEY comes from tripadvisor.com/developers, set in
 * Railway; without it this does nothing.
 */

const API = 'https://api.content.tripadvisor.com/api/v1/location';
const REFRESH_DAYS = 7;

export const tripadvisorConfigured = () => !!env.TRIPADVISOR_API_KEY;

export type TripadvisorRating = { rating: number; reviews: number; url: string; ratingImage: string };

/** Their details response, as far as we read it. Null when it is not a listing with a rating. */
export function fromDetails(d: unknown): TripadvisorRating | null {
  const x = d as { rating?: unknown; num_reviews?: unknown; web_url?: unknown; rating_image_url?: unknown } | null;
  const rating = Number(x?.rating);
  const reviews = Number(x?.num_reviews ?? 0);
  if (!x || !Number.isFinite(rating) || rating <= 0 || typeof x.web_url !== 'string') return null;
  return { rating, reviews: Number.isFinite(reviews) ? reviews : 0, url: x.web_url, ratingImage: typeof x.rating_image_url === 'string' ? x.rating_image_url : '' };
}

export async function fillTripadvisor(limit = 400): Promise<{ looked: number; rated: number; failed: number; reason?: string }> {
  // Pasted keys carry stray spaces or quotes: trimmed off, and their shape (never the key) said in the log if refused.
  const raw = env.TRIPADVISOR_API_KEY ?? '';
  const key = raw.trim().replace(/^["']|["']$/g, '');
  if (!key) return { looked: 0, rated: 0, failed: 0, reason: 'no TRIPADVISOR_API_KEY' };
  const shape = `key ${key.length} characters${raw !== key ? ', had spaces or quotes round it' : ''}`;
  const since = new Date(Date.now() - REFRESH_DAYS * 86_400_000);
  const due = await db
    .select({ id: places.id, tripadvisorId: places.tripadvisorId })
    .from(places)
    .where(and(isNotNull(places.tripadvisorId), ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), or(isNull(places.tripadvisorCheckedAt), lt(places.tripadvisorCheckedAt, since))))
    .orderBy(places.tripadvisorCheckedAt)
    .limit(limit);
  let rated = 0;
  let failed = 0;
  let reason: string | undefined;
  for (const v of due) {
    const url = `${API}/${encodeURIComponent(v.tripadvisorId!)}/details?key=${encodeURIComponent(key)}&language=en&currency=GBP`;
    let res = await fetch(url, { headers: { accept: 'application/json' } }).catch(() => null);
    // Refused plain: once more naming guide.je as the site, for a key tied to the website.
    if (res?.status === 403) res = await fetch(url, { headers: { accept: 'application/json', referer: 'https://guide.je/' } }).catch(() => null);
    // A refused key or a limit reached: stop, and try the rest another night.
    if (!res || res.status === 401 || res.status === 403 || res.status === 429) {
      failed += 1;
      // Their answer, for the log: a key restricted to a domain or IP says so here.
      reason = `${res ? `${res.status} ${(await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}` : 'no answer'}; ${shape}`;
      if (res) break;
      continue;
    }
    const found = res.ok ? fromDetails(await res.json().catch(() => null)) : null;
    await db.update(places).set({ tripadvisor: found, tripadvisorCheckedAt: new Date() }).where(eq(places.id, v.id));
    if (found) rated += 1;
  }
  return { looked: due.length, rated, failed, ...(reason ? { reason } : {}) };
}
