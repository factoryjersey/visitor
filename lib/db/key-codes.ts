import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { places, providers } from '@/lib/db/schema';

/**
 * The guide's key gives every tour guide and activity provider one marker
 * (CIOS, VAC, BBDC), from two lists: tour providers' codes and Do
 * providers' activity codes. One business may carry the same marker in
 * both (a provider and its own venue). Two businesses may never share
 * one: the key would send the reader to the wrong line.
 */

/** Every marker in use, by either list, with the business it belongs to: a provider's venue and the provider are one business. */
export async function codesInUse(): Promise<{ code: string; providerId: string | null; placeId: string | null }[]> {
  const tour = await db.select({ code: providers.code, providerId: providers.id, placeId: providers.placeId }).from(providers).where(sql`${providers.code} is not null`);
  const doing = await db.select({ code: places.activityCode, placeId: places.id }).from(places).where(sql`${places.activityCode} is not null`);
  return [
    ...tour.map((t) => ({ code: t.code!.toUpperCase(), providerId: t.providerId, placeId: t.placeId })),
    ...doing.map((d) => ({ code: d.code!.toUpperCase(), providerId: null, placeId: d.placeId })),
  ];
}

/** Whose the marker is already, if it is another business's; null when it is free or this business's own. */
export async function markerTakenBy(code: string, mine: { providerId?: string; placeId?: string | null }): Promise<string | null> {
  const upper = code.toUpperCase();
  const [provider] = await db
    .select({ name: providers.name, placeId: providers.placeId })
    .from(providers)
    .where(and(sql`upper(${providers.code}) = ${upper}`, ...(mine.providerId ? [ne(providers.id, mine.providerId)] : [])));
  if (provider && !(mine.placeId && provider.placeId === mine.placeId)) return provider.name;
  const [place] = await db
    .select({ name: places.name, id: places.id })
    .from(places)
    .where(and(sql`upper(${places.activityCode}) = ${upper}`, ...(mine.placeId ? [ne(places.id, mine.placeId)] : [])));
  if (place) {
    // A provider's own venue may share its marker.
    if (mine.providerId) {
      const [own] = await db.select({ id: providers.id }).from(providers).where(and(eq(providers.id, mine.providerId), eq(providers.placeId, place.id)));
      if (own) return null;
    }
    return place.name;
  }
  return null;
}
