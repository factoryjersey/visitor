import { and, asc, eq, ne, or, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from './index';
import { events, experiences, places, providers } from './schema';
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
    .select({ event: events, venue: { name: places.name, slug: places.slug } })
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

/** The event types in use, for the filter: "Music", "Arts & cultural". */
export async function publicEventTypes(): Promise<string[]> {
  const rows = await db.execute<{ t: string }>(
    sql`select distinct unnest(${events.eventTypes}) as t from ${events} where ${events.inclusion} <> 'excluded' and ${events.review} = 'approved' order by 1`,
  );
  return rows.map((r) => r.t);
}

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
