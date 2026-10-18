import { and, asc, eq, gte, ilike, isNotNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from './index';
import { events, places, type Category, type Inclusion } from './schema';
import { metresBetween } from '@/lib/domain/same-place';

export type EventFilter = {
  inclusion?: Inclusion;
  /** "2026-11": events on at any point in that month. */
  month?: string;
  q?: string;
  venueId?: string;
};

function monthBounds(month: string): [string, string] | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return [`${m[1]}-${m[2]}-01`, `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`];
}

export async function listEvents(f: EventFilter = {}) {
  const where: SQL[] = [];
  if (f.inclusion) where.push(eq(events.inclusion, f.inclusion));
  if (f.venueId) where.push(eq(events.placeId, f.venueId));
  if (f.q) where.push(or(ilike(events.title, `%${f.q}%`), ilike(events.venue, `%${f.q}%`))!);
  const bounds = f.month ? monthBounds(f.month) : null;
  if (bounds) where.push(lte(events.startsOn, bounds[1]), gte(events.endsOn, bounds[0]));

  return db
    .select({ event: events, venue: { id: places.id, name: places.name, slug: places.slug } })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(events.startsOn), asc(events.title));
}

export async function getEvent(slug: string) {
  const [row] = await db
    .select({ event: events, venue: places })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(eq(events.slug, slug));
  return row ?? null;
}

const eventCount = sql<number>`(select count(*) from ${events} where ${events.placeId} = ${places.id})::int`;

export type VenueFilter = {
  inclusion?: Inclusion;
  category?: Category;
  q?: string;
  /** Only places that host at least one event. The default view. */
  hostsEvents?: boolean;
};

export async function listVenues(f: VenueFilter = {}) {
  const where: SQL[] = [];
  if (f.inclusion) where.push(eq(places.inclusion, f.inclusion));
  if (f.category) where.push(eq(places.category, f.category));
  if (f.q) where.push(or(ilike(places.name, `%${f.q}%`), ilike(places.parish, `%${f.q}%`))!);
  if (f.hostsEvents) where.push(sql`${eventCount} > 0`);
  return db
    .select({ place: places, eventCount })
    .from(places)
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`${eventCount} desc`, asc(places.name));
}

export async function getVenue(slug: string) {
  const [place] = await db.select().from(places).where(eq(places.slug, slug));
  if (!place) return null;
  const hosted = await db.select().from(events).where(eq(events.placeId, place.id)).orderBy(asc(events.startsOn));
  return { place, events: hosted };
}

/** What the guide currently holds. */
export async function guideSelection() {
  const [chosenEvents, chosenVenues] = await Promise.all([
    db
      .select({ event: events, venue: places })
      .from(events)
      .leftJoin(places, eq(places.id, events.placeId))
      .where(eq(events.inclusion, 'included'))
      .orderBy(asc(events.startsOn), asc(events.title)),
    db.select().from(places).where(eq(places.inclusion, 'included')).orderBy(asc(places.category), asc(places.name)),
  ]);
  return { events: chosenEvents, venues: chosenVenues };
}

export async function mapPoints(opts: { includedOnly: boolean }) {
  const inc = opts.includedOnly ? [eq(places.inclusion, 'included')] : [];
  const venues = await db
    .select({ id: places.id, slug: places.slug, name: places.name, lat: places.lat, lon: places.lon, inclusion: places.inclusion, eventCount })
    .from(places)
    .where(and(isNotNull(places.lat), sql`${eventCount} > 0`, ...inc));
  return venues;
}


/** Listings within roughly 600m of a pin, nearest first: the choices for an event's venue. */
export async function placesNear(lat: number, lon: number, limit = 15) {
  const dLat = 0.0055;
  const dLon = 0.0085;
  const rows = await db
    .select({ id: places.id, name: places.name, lat: places.lat, lon: places.lon })
    .from(places)
    .where(and(gte(places.lat, lat - dLat), lte(places.lat, lat + dLat), gte(places.lon, lon - dLon), lte(places.lon, lon + dLon)));
  return rows
    .map((r) => ({ ...r, metres: metresBetween({ lat, lon }, { lat: r.lat!, lon: r.lon! }) }))
    .sort((a, b) => a.metres - b.metres)
    .slice(0, limit);
}
