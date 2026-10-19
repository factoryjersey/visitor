import { and, asc, eq, ne, or, inArray, notInArray, sql, type SQL } from 'drizzle-orm';
import { db } from './index';
import { events, experiences, places, providers, type Event } from './schema';
import { UNIQUE } from '@/lib/domain/occurrence';
import { nextDate } from '@/lib/domain/web-dates';
import type { Genre } from '@/lib/domain/genre';

/**
 * What the public site shows. Everything not left out — the site is the
 * whole picture, the guide is the edited selection — and only what is
 * still to come, and nothing a provider sent us that we have not yet
 * approved. Unique events and dated tours by default; ongoing and
 * on-demand ones when the visitor ticks for them. Highlights always.
 */

export const todayIso = () => new Date().toISOString().slice(0, 10);

const hasUpcoming = (col: typeof events.dates | typeof experiences.dates) =>
  sql`exists (select 1 from jsonb_array_elements(${col}) d where d->>'date' >= to_char(now(), 'YYYY-MM-DD'))`;

function inMonth(col: typeof events.dates | typeof experiences.dates, month: string): SQL | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return sql`exists (select 1 from jsonb_array_elements(${col}) d where d->>'date' between ${`${month}-01`} and ${`${month}-${String(last).padStart(2, '0')}`})`;
}

export type PublicEventFilter = { showOngoing?: boolean; month?: string; type?: string; q?: string };

export async function publicEvents(f: PublicEventFilter = {}) {
  const where: SQL[] = [ne(events.inclusion, 'excluded'), eq(events.review, 'approved'), hasUpcoming(events.dates)];
  if (!f.showOngoing) where.push(or(inArray(events.occurrence, [...UNIQUE]), eq(events.highlight, true))!);
  if (f.type) where.push(sql`${f.type} = any(${events.eventTypes})`);
  if (f.q) where.push(sql`(${events.title} ilike ${`%${f.q}%`} or ${events.venueName} ilike ${`%${f.q}%`})`);
  const month = f.month ? inMonth(events.dates, f.month) : null;
  if (month) where.push(month);

  const rows = await db
    .select({ event: events, venue: { name: places.name, slug: places.slug, parish: places.parish } })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(and(...where));
  const today = todayIso();
  return rows
    .map((r) => ({ ...r, next: nextDate(r.event.dates, today) ?? '9999' }))
    .sort((a, b) => a.next.localeCompare(b.next) || a.event.title.localeCompare(b.event.title));
}

export async function publicEvent(slug: string) {
  const [row] = await db
    .select({ event: events, venue: places })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(and(eq(events.slug, slug), ne(events.inclusion, 'excluded'), eq(events.review, 'approved')));
  return row ?? null;
}

const upcomingPublic = () => [ne(events.inclusion, 'excluded'), eq(events.review, 'approved'), hasUpcoming(events.dates)];

const byNextDate = <T extends { event: { dates: Event['dates'] } }>(rows: T[]) => {
  const today = todayIso();
  return rows.map((r) => ({ ...r, next: nextDate(r.event.dates, today) ?? '9999' })).sort((a, b) => a.next.localeCompare(b.next));
};

/** What else is on at the venue: by its place, or by name when the event has no place. */
export async function publicVenueEvents(e: Pick<Event, 'id' | 'placeId' | 'venueName'>, limit = 8) {
  const at = e.placeId ? eq(events.placeId, e.placeId) : e.venueName ? sql`lower(${events.venueName}) = lower(${e.venueName})` : null;
  if (!at) return [];
  const rows = await db
    .select({ event: { id: events.id, slug: events.slug, title: events.title, dates: events.dates, occurrence: events.occurrence } })
    .from(events)
    .where(and(...upcomingPublic(), at, ne(events.id, e.id)));
  return byNextDate(rows).slice(0, limit);
}

/** Events of the same kinds, the closest match first, then the soonest. Unique events only: they are what a visitor plans around. */
export async function publicRelatedEvents(e: Pick<Event, 'eventTypes'>, exclude: string[], limit = 4) {
  const types = e.eventTypes.filter((t) => !STAFF_ONLY_TYPES.has(t));
  if (!types.length) return [];
  const rows = await db
    .select({ event: events, venue: { name: places.name, slug: places.slug, parish: places.parish } })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(
      and(
        ...upcomingPublic(),
        inArray(events.occurrence, [...UNIQUE]),
        sql`${events.eventTypes} && ${sql`array[${sql.join(types.map((t) => sql`${t}`), sql`, `)}]::text[]`}`,
        exclude.length ? notInArray(events.id, exclude) : undefined,
      ),
    );
  const shared = (r: (typeof rows)[number]) => r.event.eventTypes.filter((t) => types.includes(t)).length;
  return byNextDate(rows)
    .sort((a, b) => shared(b) - shared(a) || a.next.localeCompare(b.next))
    .slice(0, limit);
}

/** Types for staff, not visitors: a filter for them would only lead to what review turned down. */
const STAFF_ONLY_TYPES = new Set(['Business & networking']);

export type PublicTourFilter = { showOnDemand?: boolean; genre?: Genre; month?: string; q?: string };

export async function publicTours(f: PublicTourFilter = {}) {
  const where: SQL[] = [ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved'), hasUpcoming(experiences.dates)];
  if (!f.showOnDemand) where.push(or(inArray(experiences.occurrence, [...UNIQUE]), eq(experiences.highlight, true))!);
  if (f.genre) where.push(eq(experiences.genre, f.genre));
  if (f.q) where.push(sql`(${experiences.title} ilike ${`%${f.q}%`} or ${providers.name} ilike ${`%${f.q}%`})`);
  const month = f.month ? inMonth(experiences.dates, f.month) : null;
  if (month) where.push(month);

  const rows = await db
    .select({ tour: experiences, provider: { name: providers.name, website: providers.website } })
    .from(experiences)
    .leftJoin(providers, eq(providers.id, experiences.providerId))
    .where(and(...where))
    .orderBy(asc(experiences.title));
  const today = todayIso();
  return rows
    .map((r) => ({ ...r, next: nextDate(r.tour.dates, today) ?? '9999' }))
    .sort((a, b) => {
      // Dated tours by their next date; on-demand ones after, by name.
      const ad = UNIQUE.includes(a.tour.occurrence) ? a.next : `~${a.tour.title}`;
      const bd = UNIQUE.includes(b.tour.occurrence) ? b.next : `~${b.tour.title}`;
      return ad.localeCompare(bd);
    });
}

export async function publicTour(slug: string) {
  const [row] = await db
    .select({ tour: experiences, provider: providers })
    .from(experiences)
    .leftJoin(providers, eq(providers.id, experiences.providerId))
    .where(and(eq(experiences.slug, slug), ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved')));
  return row ?? null;
}

/** A venue on the public site, by its slug: approved and not left out. */
export async function publicVenue(slug: string) {
  const [venue] = await db
    .select()
    .from(places)
    .where(and(eq(places.slug, slug), ne(places.inclusion, 'excluded'), eq(places.review, 'approved')));
  return venue ?? null;
}

/** Everything coming up at a venue, soonest first: ongoing things too, as a venue's page is its whole programme. */
export async function publicEventsAt(placeId: string) {
  const rows = await db
    .select({ event: events, venue: { name: places.name, slug: places.slug, parish: places.parish } })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(and(...upcomingPublic(), eq(events.placeId, placeId)));
  return byNextDate(rows);
}

/**
 * The venues with something coming up, and how many: the venues page and
 * the What's on venue filter. Unique events count by default, as on What's
 * on; `withOngoing` counts exhibitions and weekly sessions too.
 */
export async function publicVenuesWithEvents(opts: { withOngoing?: boolean } = {}) {
  const where = [...upcomingPublic()];
  if (!opts.withOngoing) where.push(or(inArray(events.occurrence, [...UNIQUE]), eq(events.highlight, true))!);
  const rows = await db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      parish: places.parish,
      category: places.category,
      headerImage: places.headerImage,
      summary: places.summary,
      count: sql<number>`count(${events.id})::int`,
    })
    .from(places)
    .innerJoin(events, eq(events.placeId, places.id))
    .where(and(ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), ...where))
    .groupBy(places.id);
  return rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
