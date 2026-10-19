import type { EventDate } from '@/lib/db/schema';
import { classifyOccurrence } from '@/lib/domain/occurrence';
import type { VjEvent } from '@/lib/integrations/jersey-com/parse';
import { decodeEntities, htmlToText } from '@/lib/integrations/jersey-com/parse';

/**
 * Sites built on The Events Calendar (WordPress) publish their programme
 * at /wp-json/tribe/events/v1/events: Island Ticket Hut, which sells for
 * a good share of the island's smaller nights, first among them. One
 * reader for all of them; a site is a line in SITES.
 *
 * Island Ticket Hut sells for Guernsey too. A venue's postcode says which
 * island (JE or GY); without one, the address or name; with neither, it
 * stays, and review decides.
 */

export const SITES = [{ source: 'island-ticket-hut', base: 'https://www.islandtickethut.com', name: 'Island Ticket Hut' }] as const;
export type TribeSite = (typeof SITES)[number];

export type TribeVenue = { venue?: string; address?: string | null; city?: string | null; zip?: string | null; country?: string | null; geo_lat?: number | string | null; geo_lng?: number | string | null };
export type TribeEvent = {
  id: number;
  title: string;
  url: string;
  status?: string;
  hide_from_listings?: boolean;
  description?: string;
  excerpt?: string;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  cost?: string;
  cost_details?: { values?: string[] };
  image?: { url?: string } | false;
  venue?: TribeVenue | unknown[];
  organizer?: { organizer?: string }[];
  categories?: { name: string }[];
  modified?: string;
};

export const eventsUrl = (site: Pick<TribeSite, 'base'>, page: number, from: string) =>
  `${site.base}/wp-json/tribe/events/v1/events?${new URLSearchParams({ per_page: '50', page: String(page), start_date: from })}`;

const text = (s: string | null | undefined) => (s ? decodeEntities(s).replace(/\s+/g, ' ').trim() : '');
const venueOf = (e: TribeEvent): TribeVenue | null => (e.venue && !Array.isArray(e.venue) ? (e.venue as TribeVenue) : null);

/** Jersey, Guernsey, or no telling. */
export function island(v: TribeVenue | null): 'jersey' | 'guernsey' | null {
  if (!v) return null;
  const zip = (v.zip ?? '').toUpperCase();
  const all = `${v.venue ?? ''} ${v.address ?? ''} ${v.city ?? ''} ${zip}`;
  if (/\bJE\d/i.test(zip) || /\bJE\d\s?\d[A-Z]{2}\b/i.test(all)) return 'jersey';
  if (/\bGY\d/i.test(zip) || /\bGY\d\s?\d[A-Z]{2}\b/i.test(all) || /guernsey|st\.? peter port|sark|alderney|herm\b/i.test(all)) return 'guernsey';
  if (/jersey/i.test(all)) return 'jersey';
  return null;
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** "2026-11-07 12:30:00" to and from: one date, or each day of a short run. */
export function tribeDates(e: Pick<TribeEvent, 'start_date' | 'end_date' | 'all_day'>): EventDate[] {
  const [sd, st] = e.start_date.split(' ');
  const [ed, et] = e.end_date.split(' ');
  if (!sd || !/^\d{4}-\d{2}-\d{2}$/.test(sd)) return [];
  const start = e.all_day ? null : (st?.slice(0, 5) ?? null);
  const endTime = e.all_day ? null : (et?.slice(0, 5) ?? null);
  const last = ed && ed >= sd ? ed : sd;
  const out: EventDate[] = [];
  for (let d = sd; d <= last && out.length < 31; d = addDays(d, 1)) out.push({ date: d, start, end: d === last && endTime && endTime !== start ? endTime : null });
  return out;
}

const pence = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && v.trim() !== '' ? Math.round(n * 100) : null;
};

export function toEvent(e: TribeEvent, site: TribeSite): VjEvent | null {
  if ((e.status && e.status !== 'publish') || e.hide_from_listings) return null;
  const v = venueOf(e);
  if (island(v) === 'guernsey') return null;
  const dates = tribeDates(e);
  if (!dates.length || !e.title) return null;
  const description = htmlToText(e.description ?? null);
  const excerpt = htmlToText(e.excerpt ?? null);
  const first = description?.split('\n\n')[0] ?? null;
  const prices = (e.cost_details?.values ?? []).map(pence).filter((p): p is number => p !== null).sort((a, b) => a - b);
  const free = /^free$/i.test(text(e.cost)) || (prices.length > 0 && prices.every((p) => p === 0));
  const venueName = text(v?.venue) || null;
  const lat = Number(v?.geo_lat);
  const lon = Number(v?.geo_lng);
  return {
    externalId: String(e.id),
    title: text(e.title),
    summary: excerpt ?? (first && first.length <= 400 ? first : null),
    description,
    venue: venueName,
    venueName,
    addressLine1: text(v?.address) || null,
    parish: text(v?.city) || null,
    postcode: text(v?.zip) || null,
    phone: null,
    email: null,
    website: e.url,
    eventTypes: [],
    free,
    occurrence: classifyOccurrence(dates.map((d) => d.date), { starts: dates.map((d) => d.start) }),
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lon: Number.isFinite(lon) && lon !== 0 ? lon : null,
    dates,
    startsOn: dates[0]!.date,
    endsOn: dates.at(-1)!.date,
    fromPricePence: free ? null : (prices.find((p) => p > 0) ?? null),
    toPricePence: free || prices.length < 2 ? null : prices.at(-1)!,
    headerImage: e.image && e.image.url ? { url: e.image.url, publicId: null, alt: text(e.title), originalFilename: null } : null,
    sourceLink: e.url,
    organiser: text(e.organizer?.[0]?.organizer) || null,
    modifiedAt: e.modified ? new Date(`${e.modified.replace(' ', 'T')}Z`) : null,
    portalSyncedAt: null,
  };
}

/** A title without the words that tell one performance of a show from another. */
const showName = (title: string) =>
  title.toLowerCase().replace(/\b(fundraiser|matinee|evening|afternoon|morning|relaxed performance|performance|show|early|late)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** "Fundraiser Evening – Midnight Joanna", once it is both performances: "Fundraiser – Midnight Joanna". */
const bothTimes = (title: string) =>
  title.replace(/\s*\b(matinee|evening|afternoon)\b\s*/gi, ' ').replace(/\s+([–-])\s+([–-])\s+/g, ' $1 ').replace(/\s{2,}/g, ' ').trim();

/**
 * Ticket sites sell each performance on its own, a matinee and an evening
 * as two events. The guide lists the show once, with both times: same
 * venue, same show name, the dates together and the first one's id.
 */
export function joinPerformances(events: VjEvent[]): VjEvent[] {
  const byShow = new Map<string, VjEvent>();
  for (const e of events) {
    const key = `${(e.venueName ?? '').toLowerCase()}|${showName(e.title)}`;
    const seen = byShow.get(key);
    if (!seen || !showName(e.title)) {
      byShow.set(seen ? `${key}|${e.externalId}` : key, e);
      continue;
    }
    const dates = [...seen.dates, ...e.dates].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    byShow.set(key, {
      ...seen,
      title: bothTimes(seen.title.length <= e.title.length ? seen.title : e.title),
      dates,
      startsOn: dates[0]!.date,
      endsOn: dates.at(-1)!.date,
      occurrence: classifyOccurrence(dates.map((d) => d.date), { starts: dates.map((d) => d.start) }),
      fromPricePence: [seen.fromPricePence, e.fromPricePence].filter((p): p is number => p !== null).sort((a, b) => a - b)[0] ?? null,
      toPricePence: Math.max(seen.toPricePence ?? 0, e.toPricePence ?? 0, seen.fromPricePence ?? 0, e.fromPricePence ?? 0) || null,
    });
  }
  return [...byShow.values()];
}
