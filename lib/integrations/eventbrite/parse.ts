import type { EventDate, Image } from '@/lib/db/schema';
import { classifyOccurrence } from '@/lib/domain/occurrence';
import { parishOf } from '@/lib/domain/parish';
import { tidyVenue } from '@/lib/domain/venue-match';
import type { VjEvent } from '@/lib/integrations/jersey-com/parse';
import { decodeEntities } from '@/lib/integrations/jersey-com/parse';

/**
 * Eventbrite's public pages, read the way a search engine reads them: the
 * schema.org Event data in each page's JSON-LD. The Jersey listing pages
 * give every event's name, day, venue, pin, image and summary; each
 * event's own page adds the times and the price. Eventbrite's search API
 * closed to the public in 2020, so this is the only way in.
 *
 * Pure: fetching and pacing are the importer's.
 */

export type LdEvent = {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  url?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: string;
  eventAttendanceMode?: string;
  location?: {
    '@type'?: string;
    name?: string;
    geo?: { latitude?: string | number; longitude?: string | number };
    address?: { streetAddress?: string; addressLocality?: string; addressRegion?: string; postalCode?: string; addressCountry?: string };
  };
  offers?: { lowPrice?: string | number; highPrice?: string | number; price?: string | number }[] | { lowPrice?: string | number; highPrice?: string | number; price?: string | number };
  organizer?: { name?: string; url?: string };
};

/** Every schema.org Event in a page's JSON-LD, however deeply it is nested. */
export function ldEvents(html: string): LdEvent[] {
  const out: LdEvent[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    const types = ([] as unknown[]).concat(o['@type'] ?? []);
    if (types.some((t) => typeof t === 'string' && /Event$/.test(t))) out.push(o as LdEvent);
    else Object.values(o).forEach(walk);
  };
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1]!));
    } catch {
      // A broken block on one page should not lose the others.
    }
  }
  return out;
}

/** The number on the end of an event's URL: "…-tickets-1994783414892". */
export function eventbriteId(url: string | undefined): string | null {
  return url ? (/(\d{6,})(?:[/?#]|$)/.exec(url)?.[1] ?? null) : null;
}

/** In Jersey, in person. The Jersey search also finds the odd event elsewhere, and online ones. */
export function isJerseyInPerson(e: LdEvent): boolean {
  if (/Online/i.test(e.eventAttendanceMode ?? '') || /Virtual/i.test(e.location?.['@type'] ?? '')) return false;
  const a = e.location?.address;
  return /^JE\d/i.test(a?.postalCode?.trim() ?? '') || a?.addressCountry?.toUpperCase() === 'JE';
}

const JERSEY_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Jersey', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** "2026-11-07T19:30:00Z" to Jersey's day and clock; "2026-11-07" to the day alone. */
export function localTime(iso: string | undefined): { date: string; time: string | null } | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { date: iso, time: null };
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const parts = Object.fromEntries(JERSEY_TIME.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * The days an event is on. A night that runs past midnight is one date;
 * a camp from Monday to Friday is five, each with the same times.
 */
export function eventDates(start: string | undefined, end: string | undefined): EventDate[] {
  const s = localTime(start);
  if (!s) return [];
  const e = localTime(end);
  if (!e || e.date <= s.date) return [{ date: s.date, start: s.time, end: e?.time ?? null }];
  // Ends the next morning: a late night, not a second day. Without times
  // (the listing page alone), ending the next day is read the same way.
  if (e.date === addDays(s.date, 1) && (e.time === null || e.time <= '06:00')) return [{ date: s.date, start: s.time, end: e.time }];
  const out: EventDate[] = [];
  for (let d = s.date; d <= e.date && out.length < 62; d = addDays(d, 1)) out.push({ date: d, start: s.time, end: e.time });
  return out;
}

const TYPE_LABEL: Record<string, string> = {
  MusicEvent: 'Music',
  TheaterEvent: 'Arts & cultural',
  ComedyEvent: 'Arts & cultural',
  DanceEvent: 'Arts & cultural',
  ExhibitionEvent: 'Arts & cultural',
  ScreeningEvent: 'Arts & cultural',
  LiteraryEvent: 'Arts & cultural',
  VisualArtsEvent: 'Arts & cultural',
  Festival: 'Festivals',
  FoodEvent: 'Food & drink',
  SportsEvent: 'Sports',
  ChildrensEvent: 'Family friendly',
};

function pence(v: string | number | undefined): number | null {
  const n = typeof v === 'number' ? v : v ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** "David Place, JE2 4TD Saint Helier" to "David Place": the postcode and parish have their own fields. */
function street(raw: string | undefined, postcode: string | null): string | null {
  if (!raw) return null;
  let s = raw;
  if (postcode) s = s.replace(new RegExp(`,?\\s*${postcode.replace(/\s+/g, '\\s*')}.*$`, 'i'), '');
  s = s.replace(/,?\s*(Saint|St\.?)[ -]\w+$/i, '').trim();
  return s || null;
}

/**
 * One event, from its listing entry and, when we have it, its own page.
 * Null for anything not in Jersey and in person, or cancelled.
 */
export function toEvent(listing: LdEvent, page: LdEvent | null): VjEvent | null {
  const e = { ...listing, ...(page ?? {}) };
  if (!isJerseyInPerson(e) || /Cancelled/i.test(e.eventStatus ?? '')) return null;
  const id = eventbriteId(e.url);
  const title = decodeEntities(e.name ?? '').trim();
  if (!id || !title) return null;

  const dates = eventDates(e.startDate, e.endDate);
  if (!dates.length) return null;
  const a = e.location?.address ?? {};
  const postcode = a.postalCode?.trim().toUpperCase() || null;
  const lat = Number(e.location?.geo?.latitude);
  const lon = Number(e.location?.geo?.longitude);
  const offers = ([] as NonNullable<LdEvent['offers']>[]).concat(e.offers ?? []).flat() as { lowPrice?: string | number; highPrice?: string | number; price?: string | number }[];
  const low = offers.map((o) => pence(o.lowPrice ?? o.price)).filter((n): n is number => n !== null);
  const high = offers.map((o) => pence(o.highPrice ?? o.price)).filter((n): n is number => n !== null);
  const from = low.length ? Math.min(...low) : null;
  const to = high.length ? Math.max(...high) : null;
  const types = ([] as string[]).concat(page?.['@type'] ?? []);
  const venueName = e.location?.name ? decodeEntities(e.location.name).trim() : null;
  const image: Image | null = e.image ? { url: e.image, publicId: null, alt: null, originalFilename: null } : null;

  return {
    externalId: id,
    title,
    summary: e.description ? decodeEntities(e.description).trim() || null : null,
    description: null,
    venue: tidyVenue([venueName, street(a.streetAddress, postcode)].filter(Boolean).join(', ') || null),
    venueName,
    addressLine1: street(a.streetAddress, postcode),
    parish: parishOf(a.addressRegion) ?? parishOf(a.addressLocality),
    postcode,
    phone: null,
    email: null,
    website: e.url ?? null,
    eventTypes: [...new Set(types.map((t) => TYPE_LABEL[t]).filter((t): t is string => !!t))],
    free: from === 0 && (to ?? 0) === 0,
    occurrence: classifyOccurrence(dates.map((d) => d.date), { starts: dates.map((d) => d.start) }),
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lon: Number.isFinite(lon) && lon !== 0 ? lon : null,
    dates,
    startsOn: dates[0]!.date,
    endsOn: dates.at(-1)!.date,
    fromPricePence: from === 0 ? null : from,
    toPricePence: to === 0 || to === from ? null : to,
    headerImage: image,
    sourceLink: e.url ?? null,
    organiser: decodeEntities(e.organizer?.name ?? '').trim() || null,
    modifiedAt: null,
    portalSyncedAt: null,
  };
}
