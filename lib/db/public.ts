import { organiserKey } from '@/lib/domain/organiser';
import { and, asc, eq, ne, or, inArray, notInArray, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { db } from './index';
import { events, experiences, organiserProfiles, places, providers, type Category, type Event } from './schema';
import { UNIQUE } from '@/lib/domain/occurrence';
import { nextDate } from '@/lib/domain/web-dates';
import type { Genre } from '@/lib/domain/genre';
import { normaliseName } from '@/lib/domain/same-place';
import { slugify } from '@/lib/domain/slug';
import { likeEscape } from '@/lib/domain/search';

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

/** Any of its days between two dates, both inclusive. */
const inRange = (col: typeof events.dates | typeof experiences.dates, r: { from: string; to: string }) =>
  sql`exists (select 1 from jsonb_array_elements(${col}) d where d->>'date' between ${r.from} and ${r.to})`;

/** `range`: only what has a day in it, sorted and grouped by its first day there. */
export type PublicEventFilter = { showOngoing?: boolean; range?: { from: string; to: string } | null; type?: string; q?: string };

export async function publicEvents(f: PublicEventFilter = {}) {
  const where: SQL[] = [ne(events.inclusion, 'excluded'), eq(events.review, 'approved'), hasUpcoming(events.dates)];
  if (!f.showOngoing) where.push(or(inArray(events.occurrence, [...UNIQUE]), eq(events.highlight, true))!);
  if (f.type) where.push(sql`${f.type} = any(${events.eventTypes})`);
  if (f.q) where.push(sql`(${events.title} ilike ${`%${f.q}%`} or ${events.venueName} ilike ${`%${f.q}%`})`);
  if (f.range) where.push(inRange(events.dates, f.range));

  const rows = await db
    .select({ event: events, venue: { name: places.name, slug: places.slug, parish: places.parish } })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(and(...where));
  const today = todayIso();
  const from = f.range && f.range.from > today ? f.range.from : today;
  return rows
    .map((r) => ({ ...r, next: nextDate(r.event.dates, from) ?? '9999' }))
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

export type PublicTourFilter = { showOnDemand?: boolean; genre?: Genre; range?: { from: string; to: string } | null; q?: string };

export async function publicTours(f: PublicTourFilter = {}) {
  const where: SQL[] = [ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved'), hasUpcoming(experiences.dates)];
  if (!f.showOnDemand) where.push(or(inArray(experiences.occurrence, [...UNIQUE]), eq(experiences.highlight, true))!);
  if (f.genre) where.push(eq(experiences.genre, f.genre));
  if (f.q) where.push(sql`(${experiences.title} ilike ${`%${f.q}%`} or ${providers.name} ilike ${`%${f.q}%`})`);
  if (f.range) where.push(inRange(experiences.dates, f.range));

  const rows = await db
    .select({ tour: experiences, provider: { id: providers.id, name: providers.name, website: providers.website } })
    .from(experiences)
    .leftJoin(providers, eq(providers.id, experiences.providerId))
    .where(and(...where))
    .orderBy(asc(experiences.title));
  const today = todayIso();
  const from = f.range && f.range.from > today ? f.range.from : today;
  return rows
    .map((r) => ({ ...r, next: nextDate(r.tour.dates, from) ?? '9999' }))
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

/** The venue an address belonged to before it was merged into another, so an old link still arrives. */
export async function venueFormerlyAt(slug: string) {
  const [row] = await db
    .select({ slug: places.slug })
    .from(places)
    .where(and(sql`${slug} = any(${places.formerSlugs})`, ne(places.inclusion, 'excluded'), eq(places.review, 'approved')));
  return row?.slug ?? null;
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
      summary: sql<string | null>`coalesce(${places.guideCopy}, ${places.summary})`,
      recommendedIn: places.recommendedIn,
      count: sql<number>`count(${events.id})::int`,
    })
    .from(places)
    .innerJoin(events, eq(events.placeId, places.id))
    .where(and(ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), ...where))
    .groupBy(places.id);
  return rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * The venues page: every venue or business with events or tours coming
 * up, the busiest first. A tour counts for its operator's own listing.
 */
export async function publicVenuesWithSomethingOn() {
  const [byEvent, byTour] = await Promise.all([
    publicVenuesWithEvents({ withOngoing: true }),
    db
      .select({ id: places.id, slug: places.slug, name: places.name, parish: places.parish, category: places.category, headerImage: places.headerImage, summary: places.summary, recommendedIn: places.recommendedIn, tours: sql<number>`count(${experiences.id})::int` })
      .from(places)
      .innerJoin(providers, eq(providers.placeId, places.id))
      .innerJoin(experiences, eq(experiences.providerId, providers.id))
      .where(and(ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved'), hasUpcoming(experiences.dates)))
      .groupBy(places.id),
  ]);
  const all = new Map(byEvent.map((v) => [v.id, { ...v, events: v.count, tours: 0 }]));
  for (const t of byTour) {
    const seen = all.get(t.id);
    if (seen) seen.tours = t.tours;
    else all.set(t.id, { ...t, count: 0, events: 0 });
  }
  return [...all.values()].sort((a, b) => b.events + b.tours - (a.events + a.tours) || a.name.localeCompare(b.name));
}

/** Every venue and business we list, by guide section, the visitor guide featured first, then A to Z; with what the printed guide gave each, for the page to lay out as a spread. */
export async function publicAllVenues(category?: Category) {
  const rows = await db
    .select({ id: places.id, slug: places.slug, name: places.name, parish: places.parish, category: places.category, headerImage: places.headerImage, summary: places.summary, recommendedIn: places.recommendedIn, listingSize: places.listingSize, guideCopy: places.guideCopy, guideLabel: places.guideLabel, aaRating: places.aaRating, stayType: places.stayType })
    .from(places)
    .where(and(ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), ...(category ? [eq(places.category, category)] : [])));
  return rows.sort((a, b) => Number(!a.recommendedIn) - Number(!b.recommendedIn) || a.name.localeCompare(b.name));
}

export type Organiser = { slug: string; name: string; names: string[]; providerIds: string[]; website: string | null; events: number; tours: number };

/** Names as one: "The National Trust for Jersey" and "National Trust for Jersey" are the same people. */

/**
 * Who puts things on: the organisers the sources name on events
 * (Eventbrite's, the charities') and the operators who run tours, as one
 * list with how many of each are coming up. Most first.
 */
export async function publicOrganisers(): Promise<Organiser[]> {
  const [byEvent, byTour] = await Promise.all([
    db
      .select({ name: events.organiser, n: sql<number>`count(*)::int` })
      .from(events)
      .where(and(...upcomingPublic(), sql`${events.organiser} is not null`))
      .groupBy(events.organiser),
    db
      .select({ id: providers.id, name: providers.name, website: providers.website, n: sql<number>`count(*)::int` })
      .from(experiences)
      .innerJoin(providers, eq(providers.id, experiences.providerId))
      .where(and(ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved'), hasUpcoming(experiences.dates)))
      .groupBy(providers.id),
  ]);
  const all = new Map<string, Organiser>();
  const add = (name: string, f: (o: Organiser) => void) => {
    const key = organiserKey(name);
    if (!key) return;
    const o = all.get(key) ?? { slug: '', name, names: [], providerIds: [], website: null, events: 0, tours: 0 };
    f(o);
    all.set(key, o);
  };
  for (const r of byEvent) add(r.name!, (o) => { o.events += r.n; o.names.push(r.name!); });
  for (const r of byTour) add(r.name, (o) => { o.tours += r.n; o.providerIds.push(r.id); o.website ??= r.website; o.name = r.name; });
  const list = [...all.values()];
  const taken = new Set<string>();
  for (const o of list.sort((a, b) => b.events + b.tours - (a.events + a.tours) || a.name.localeCompare(b.name))) {
    let slug = slugify(o.name) || 'organiser';
    for (let i = 2; taken.has(slug); i += 1) slug = `${slugify(o.name)}-${i}`;
    taken.add(slug);
    o.slug = slug;
  }
  return list;
}

/** One organiser and everything they have coming up: their events, then their tours. */
export async function publicOrganiser(slug: string) {
  // By its own slug, or by any spelling it was merged from (an event's sidebar links by the event's).
  const all = await publicOrganisers();
  const organiser = all.find((o) => o.slug === slug) ?? all.find((o) => o.names.some((n) => slugify(n) === slug));
  if (!organiser) return null;
  const [eventRows, tourRows] = await Promise.all([
    organiser.names.length
      ? db
          .select({ event: events, venue: { name: places.name, slug: places.slug, parish: places.parish } })
          .from(events)
          .leftJoin(places, eq(places.id, events.placeId))
          .where(and(...upcomingPublic(), inArray(events.organiser, organiser.names)))
      : Promise.resolve([]),
    organiser.providerIds.length
      ? db
          .select({ tour: experiences })
          .from(experiences)
          .where(and(ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved'), hasUpcoming(experiences.dates), inArray(experiences.providerId, organiser.providerIds)))
      : Promise.resolve([]),
  ]);
  const today = todayIso();
  return {
    organiser,
    events: byNextDate(eventRows),
    tours: tourRows.map((r) => ({ ...r, next: nextDate(r.tour.dates, today) ?? '9999' })).sort((a, b) => a.next.localeCompare(b.next)),
  };
}

/** A public venue by its name, as a tour gives its meeting place or operator: for a link, so only an exact match. */
export async function publicVenueNamed(...names: (string | null | undefined)[]) {
  const wanted = names.filter((n): n is string => !!n?.trim()).map((n) => normaliseName(n));
  if (!wanted.length) return null;
  const rows = await db
    .select({ name: places.name, slug: places.slug })
    .from(places)
    .where(and(ne(places.inclusion, 'excluded'), eq(places.review, 'approved'), inArray(sql`lower(${places.name})`, names.filter((n): n is string => !!n?.trim()).map((n) => n.trim().toLowerCase()))));
  return rows.find((r) => wanted.includes(normaliseName(r.name))) ?? null;
}

/** The picture an organiser's events fall back on, if staff have set one. */
export async function organiserFallback(name: string) {
  const [row] = await db.select({ image: organiserProfiles.fallbackImage }).from(organiserProfiles).where(eq(organiserProfiles.key, organiserKey(name)));
  return row?.image ?? null;
}

/** Every word typed found in one of these columns or another: "jazz helier" is jazz in St Helier. */
const allWordsIn = (words: string[], cols: AnyColumn[]) => and(...words.map((w) => or(...cols.map((c) => sql`${c} ilike ${`%${likeEscape(w)}%`}`))));

/**
 * The site search: events (ongoing ones too), tours (on-demand ones too)
 * and venues, each matched on every word typed. With nothing typed, all
 * of them, for browsing an area.
 */
export async function publicSearch(words: string[]) {
  const eventWhere: SQL[] = [ne(events.inclusion, 'excluded'), eq(events.review, 'approved'), hasUpcoming(events.dates)];
  const tourWhere: SQL[] = [ne(experiences.inclusion, 'excluded'), eq(experiences.review, 'approved'), hasUpcoming(experiences.dates)];
  const venueWhere: SQL[] = [ne(places.inclusion, 'excluded'), eq(places.review, 'approved')];
  if (words.length) {
    eventWhere.push(allWordsIn(words, [events.title, events.venueName, places.name, events.parish, places.parish, events.summary])!);
    tourWhere.push(allWordsIn(words, [experiences.title, providers.name, experiences.meetingPoint, experiences.parish, experiences.summary])!);
    venueWhere.push(allWordsIn(words, [places.name, places.parish, places.summary, places.stayType])!);
  }
  const [eventRows, tourRows, venueRows] = await Promise.all([
    db
      .select({ event: events, venue: { name: places.name, slug: places.slug, parish: places.parish } })
      .from(events)
      .leftJoin(places, eq(places.id, events.placeId))
      .where(and(...eventWhere)),
    db
      .select({ tour: experiences, provider: { id: providers.id, name: providers.name } })
      .from(experiences)
      .leftJoin(providers, eq(providers.id, experiences.providerId))
      .where(and(...tourWhere)),
    db
      .select({ id: places.id, slug: places.slug, name: places.name, parish: places.parish, category: places.category, stayType: places.stayType, headerImage: places.headerImage, recommendedIn: places.recommendedIn })
      .from(places)
      .where(and(...venueWhere)),
  ]);
  const today = todayIso();
  return {
    events: eventRows.map((r) => ({ ...r, next: nextDate(r.event.dates, today) ?? '9999' })),
    tours: tourRows.map((r) => ({ ...r, next: nextDate(r.tour.dates, today) ?? '9999' })),
    venues: venueRows,
  };
}
