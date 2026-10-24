import { and, eq, isNull, lt, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { places } from '@/lib/db/schema';
import { pickGooglePlace } from '@/lib/domain/google-match';
import { printParish } from '@/lib/domain/house-style';
import { googleConfigured, searchPlaces } from './places';

const RETRY_DAYS = 30;

/**
 * Finds each listed venue's Google place, a batch a night: the ones never
 * looked for first, then any not found that were last tried a month ago.
 * A place set or cleared by a person is left alone.
 */
export async function matchGooglePlaces(limit = 150): Promise<{ looked: number; matched: number }> {
  if (!googleConfigured()) return { looked: 0, matched: 0 };
  const since = new Date(Date.now() - RETRY_DAYS * 86_400_000);
  const due = await db
    .select({ id: places.id, name: places.name, parish: places.parish, lat: places.lat, lon: places.lon })
    .from(places)
    .where(and(ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), eq(places.googleLocked, false), isNull(places.googlePlaceId), or(isNull(places.googleCheckedAt), lt(places.googleCheckedAt, since))))
    .orderBy(places.googleCheckedAt)
    .limit(limit);
  let matched = 0;
  for (const v of due) {
    const near = v.lat !== null && v.lon !== null ? { lat: v.lat, lon: v.lon } : null;
    const found = pickGooglePlace(v, await searchPlaces([v.name, printParish(v.parish), 'Jersey'].filter(Boolean).join(', '), near));
    await db.update(places).set({ googlePlaceId: found?.id ?? null, googleCheckedAt: new Date() }).where(eq(places.id, v.id));
    if (found) matched += 1;
  }
  return { looked: due.length, matched };
}
