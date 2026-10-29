import { eventOut, tourOut, venueOut } from '@/lib/agents/data';
import { publicEvent, publicEvents, publicTour, publicTours, publicVenuesWithEvents, todayIso } from '@/lib/db/public';
import { GENRES, type Genre } from '@/lib/domain/genre';

/**
 * The searches behind the public API and the MCP server: the site's own
 * listings, as the site shows them, with a few filters agents ask for
 * that a visitor's page does not need (a range of days, a limit).
 */

export type EventQuery = { q?: string; from?: string; to?: string; kind?: string; venue?: string; includeOngoing?: boolean; limit?: number };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const clampLimit = (n: number | undefined, max = 200) => Math.max(1, Math.min(max, Math.floor(n ?? 50)));

export async function searchEvents(query: EventQuery) {
  const today = todayIso();
  const from = query.from && DAY.test(query.from) && query.from > today ? query.from : today;
  const to = query.to && DAY.test(query.to) ? query.to : null;
  const rows = await publicEvents({ showOngoing: query.includeOngoing, q: query.q?.trim() || undefined, type: query.kind || undefined });
  const venue = query.venue?.trim().toLowerCase();
  const out = rows
    .filter((r) => r.event.dates.some((d) => d.date >= from && (!to || d.date <= to)))
    .filter((r) => !venue || r.venue?.slug === venue || (r.event.venueName ?? r.venue?.name ?? '').toLowerCase().includes(venue))
    .map((r) => eventOut({ ...r.event, ...r.text }, r.venue, from));
  const limit = clampLimit(query.limit);
  return { total: out.length, events: out.slice(0, limit) };
}

export async function getEvent(slug: string) {
  const row = await publicEvent(slug);
  return row ? eventOut(row.event, row.venue, todayIso()) : null;
}

export type TourQuery = { q?: string; kind?: string; includeAnyDay?: boolean; limit?: number };

export async function searchTours(query: TourQuery) {
  const genre = GENRES.includes(query.kind as Genre) ? (query.kind as Genre) : undefined;
  const rows = await publicTours({ showOnDemand: query.includeAnyDay ?? true, genre, q: query.q?.trim() || undefined });
  const today = todayIso();
  const out = rows.map((r) => tourOut(r.tour, r.provider, today));
  return { total: out.length, tours: out.slice(0, clampLimit(query.limit)) };
}

export async function getTour(slug: string) {
  const row = await publicTour(slug);
  return row ? tourOut(row.tour, row.provider, todayIso()) : null;
}

export async function listVenues() {
  const rows = await publicVenuesWithEvents({ withOngoing: true });
  return { total: rows.length, venues: rows.map((v) => ({ ...venueOut({ ...v, addressLine1: null, postcode: null, website: null, phone: null, lat: null, lon: null }, v.count) })) };
}

/** Open to any site or agent: read-only, no cookies. */
export const API_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
  'cache-control': 'public, max-age=300',
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: API_HEADERS });
export const preflight = () => new Response(null, { status: 204, headers: API_HEADERS });
