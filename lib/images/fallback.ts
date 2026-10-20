import { and, eq, gte, isNotNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, organiserProfiles, places, type FieldSources, type Image } from '@/lib/db/schema';
import { organiserKey } from '@/lib/domain/organiser';
import { env } from '@/lib/env';
import { copyImageToStorage, isOurs } from './upload';

/**
 * An event without a picture of its own shows the picture staff chose
 * for its organiser, else its venue's (the fallback staff set, or failing
 * that the venue's own listing picture), before any stock photograph: a
 * Bulls home game shows the Bulls in their strip, not Springfield's
 * stands, and a quiz at the Ommaroo shows the Ommaroo. Organisers have a
 * picture only when someone sets one, so most events take their venue's.
 *
 * Recorded as the "fallback" source, so it gives way to a picture a
 * source sends and never to stock, follows the organiser or venue when
 * they change theirs, and goes when they take theirs away. A picture a
 * person chose (a locked field) is never touched.
 */

type Candidate = { id: string; organiser: string | null; placeId: string | null; headerImage: Image | null; fieldSources: FieldSources };

/** Which fallback an event takes, if any, and where it came from. */
export function fallbackFor(
  e: Pick<Candidate, 'organiser' | 'placeId'>,
  byOrganiser: Map<string, Image>,
  byVenue: Map<string, Image>,
): { image: Image; ref: string } | null {
  const key = e.organiser ? organiserKey(e.organiser) : '';
  const fromOrganiser = key ? byOrganiser.get(key) : undefined;
  if (fromOrganiser) return { image: fromOrganiser, ref: `organiser/${key}` };
  const fromVenue = e.placeId ? byVenue.get(e.placeId) : undefined;
  if (fromVenue) return { image: fromVenue, ref: `venue/${e.placeId}` };
  return null;
}

/** The copy we keep of a fallback picture: where it came from goes in originalFilename, the rest stays. */
const owned = (image: Image, url: string): Image => ({ ...image, url, originalFilename: image.originalFilename ?? image.url });

/**
 * Fallback pictures set as a link to someone else's site, copied into our
 * own storage so a club tidying its media library does not blank thirty
 * fixtures. One that cannot be copied keeps its link and is tried again
 * next time.
 */
export async function ownFallbacks(): Promise<number> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  let copied = 0;
  const copy = async (kind: string, id: string, image: Image) => {
    try {
      const url = await copyImageToStorage(kind, id, image.url);
      copied += 1;
      return owned(image, url);
    } catch (e) {
      console.warn(`fallback picture ${image.url} not copied: ${(e as Error).message}`);
      return null;
    }
  };
  for (const o of await db.select({ key: organiserProfiles.key, image: organiserProfiles.fallbackImage }).from(organiserProfiles).where(isNotNull(organiserProfiles.fallbackImage))) {
    if (isOurs(o.image!.url)) continue;
    const image = await copy('fallback-organiser', o.key, o.image!);
    if (image) await db.update(organiserProfiles).set({ fallbackImage: image, updatedAt: new Date() }).where(eq(organiserProfiles.key, o.key));
  }
  for (const v of await db.select({ id: places.id, image: places.fallbackImage }).from(places).where(isNotNull(places.fallbackImage))) {
    if (isOurs(v.image!.url)) continue;
    const image = await copy('fallback-venue', v.id, v.image!);
    if (image) await db.update(places).set({ fallbackImage: image, updatedAt: new Date() }).where(eq(places.id, v.id));
  }
  return copied;
}

/** Pictures a fallback may replace: none, a stock one, or an earlier fallback. */
const replaceable = (e: Candidate) => !e.headerImage || ['stock', 'fallback'].includes(e.fieldSources.headerImage?.source ?? '');

/**
 * Brings every event still to come in line with the fallbacks as they
 * stand. Returns how many it changed. An event whose fallback was taken
 * away is left without a picture, for the stock pass to fill.
 */
export async function applyFallbacks(): Promise<number> {
  await ownFallbacks();
  const today = new Date().toISOString().slice(0, 10);
  const [organisers, venues, rows] = await Promise.all([
    db.select({ key: organiserProfiles.key, image: organiserProfiles.fallbackImage }).from(organiserProfiles).where(isNotNull(organiserProfiles.fallbackImage)),
    // A venue's own picture, the one its listing came with, unless staff have set another.
    db.select({ id: places.id, image: sql<Image | null>`coalesce(${places.fallbackImage}, ${places.headerImage})` }).from(places).where(or(isNotNull(places.fallbackImage), isNotNull(places.headerImage))),
    db
      .select({ id: events.id, organiser: events.organiser, placeId: events.placeId, headerImage: events.headerImage, fieldSources: events.fieldSources })
      .from(events)
      .where(and(gte(events.endsOn, today), ne(events.inclusion, 'excluded'), sql`not ('headerImage' = any(${events.lockedFields}))`)),
  ]);
  const byOrganiser = new Map(organisers.map((o) => [o.key, o.image!]));
  const byVenue = new Map(venues.map((v) => [v.id, v.image!]));

  let changed = 0;
  for (const e of rows.filter(replaceable)) {
    const fb = fallbackFor(e, byOrganiser, byVenue);
    const wasFallback = e.fieldSources.headerImage?.source === 'fallback';
    if (fb) {
      if (e.headerImage?.url === fb.image.url && e.fieldSources.headerImage?.ref === fb.ref) continue;
      await db
        .update(events)
        .set({ headerImage: fb.image, fieldSources: { ...e.fieldSources, headerImage: { source: 'fallback', ref: fb.ref, at: new Date().toISOString() } } })
        .where(eq(events.id, e.id));
      changed += 1;
    } else if (wasFallback) {
      const { headerImage: _, ...rest } = e.fieldSources;
      await db.update(events).set({ headerImage: null, fieldSources: rest }).where(eq(events.id, e.id));
      changed += 1;
    }
  }
  return changed;
}
