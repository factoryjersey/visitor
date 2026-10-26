import type { Category, EventDate, Image } from '@/lib/db/schema';
import type { ListingType, PlaceType, RawItem } from './directory';
import { suggestGenre, type Genre } from '@/lib/domain/genre';
import { classifyOccurrence, type Occurrence } from '@/lib/domain/occurrence';
import { tidyParish } from '@/lib/domain/parish';
import { tidyVenue } from '@/lib/domain/venue-match';

export { tidyParish };

/**
 * One Visit Jersey listing read into the shape a guide wants. Pure: no
 * fetching, no database, so every trap in docs/visit-jersey.md can be
 * pinned by a test.
 */

export type VjPlace = {
  externalId: string;
  type: PlaceType;
  category: Category;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postcode: string | null;
  parish: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  summary: string | null;
  description: string | null;
  facilities: string[];
  accessibility: string[];
  openMonths: number[];
  lowRatePence: number | null;
  highRatePence: number | null;
  aaRating: string | null;
  /** Accommodation only: Hotel, Guest house, Self-catering… Left out for other listings, so a hotel's restaurant listing does not clear it. */
  stayType?: string | null;
  headerImage: Image | null;
  gallery: Image[];
  sourceLink: string | null;
  modifiedAt: Date | null;
  portalSyncedAt: Date | null;
};

export type VjEvent = {
  externalId: string;
  title: string;
  summary: string | null;
  description: string | null;
  venue: string | null;
  /** The venue as the listing names it, and its street, parish and postcode. */
  venueName: string | null;
  addressLine1: string | null;
  parish: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Their event types: "Music", "Arts & cultural". */
  eventTypes: string[];
  /** The listing says it costs nothing, rather than saying nothing. */
  free: boolean;
  occurrence: Occurrence;
  lat: number | null;
  lon: number | null;
  dates: EventDate[];
  startsOn: string | null;
  endsOn: string | null;
  fromPricePence: number | null;
  toPricePence: number | null;
  headerImage: Image | null;
  /** More pictures, after the header: Visit Jersey sends several. */
  gallery?: Image[];
  sourceLink: string | null;
  /** Who puts it on, when the source says: an Eventbrite organiser, the charity in the diary. */
  organiser?: string | null;
  modifiedAt: Date | null;
  portalSyncedAt: Date | null;
};

/** Their eight listing types, folded into the guide's five sections. */
export const CATEGORY_OF: Record<PlaceType, Category> = {
  accommodation: 'stay',
  'food-and-drink': 'eat-drink',
  attractions: 'see',
  'points-of-interest': 'see',
  activities: 'do',
  'tours-and-activities': 'do',
  'tour-operators': 'do',
  'shopping-and-markets': 'shop',
};

/**
 * WordPress renders text as HTML, so "Gardener's Rest" arrives as
 * "Gardener&#8217;s Rest". Numeric references and the common named
 * entities, rather than a parser for a handful of fields.
 */
export function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
    ndash: '–', mdash: '—', hellip: '…', pound: '£', eacute: 'é',
  };
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => named[n.toLowerCase()] ?? m);
}

/** HTML copy to plain paragraphs, separated by a blank line. */
export function htmlToText(html: unknown): string | null {
  if (typeof html !== 'string') return null;
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  )
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/[ \t]+/g, ' ').trim())
    .filter((p) => p !== '')
    .join('\n\n');
  return text === '' ? null : text;
}


function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function labelOf(v: unknown): string | null {
  if (v === null || typeof v !== 'object') return null;
  return str((v as { label?: unknown }).label);
}

/** Their `[{value, label}]` arrays: the label is the words. "Not Applicable" is not a facility. */
export function labels(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(labelOf)
    .filter((l): l is string => l !== null && !/^(not applicable|n\/a|none)$/i.test(l))
    .map(decodeEntities);
}

/** "Gorey, Jersey" is "Gorey": the island is not part of an address on the island. */
function addressLine(v: unknown): string | null {
  const s = str(v);
  if (s === null) return null;
  const out = decodeEntities(s).replace(/,?\s*Jersey\.?$/i, '').trim();
  return out === '' ? null : out;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** `seasonality` holds one entry per month open; read either value or label. */
export function months(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<number>();
  for (const item of v) {
    if (item === null || typeof item !== 'object') continue;
    for (const k of ['label', 'value'] as const) {
      const s = str((item as Record<string, unknown>)[k])?.toLowerCase();
      const i = s === undefined ? -1 : MONTHS.indexOf(s.slice(0, 3));
      if (i >= 0) {
        out.add(i + 1);
        break;
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** A bare number of pounds, as `high_season_rate` gives it, to pence. */
export function pence(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[£,\s]/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/**
 * The image fields are JSON *strings* that have to be parsed a second
 * time, each holding one image or a list of them.
 */
export function images(v: unknown): Image[] {
  let parsed: unknown = v;
  if (typeof v === 'string') {
    try {
      parsed = JSON.parse(v);
    } catch {
      return [];
    }
  }
  const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const out: Image[] = [];
  for (const item of list) {
    if (item === null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const url = str(o.url) ?? str(o.secure_url);
    if (url === null) continue;
    out.push({
      url,
      publicId: str(o.public_id),
      alt: str(o.alt_text),
      originalFilename: str(o.original_filename),
    });
  }
  return out;
}

/** WordPress gives `modified_gmt` without a zone; it is UTC. */
export function utc(v: unknown): Date | null {
  const s = str(v);
  if (s === null) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Jersey, roughly. A pin outside it was entered wrong at their end. */
function pin(acf: Record<string, unknown>): { lat: number | null; lon: number | null } {
  const loc = acf.map_location as { lat?: unknown; lng?: unknown } | undefined;
  const lat = Number(loc?.lat ?? acf.map_location_lat);
  const lon = Number(loc?.lng ?? acf.map_location_lng);
  const ok = lat > 49.1 && lat < 49.3 && lon > -2.3 && lon < -1.99;
  return ok ? { lat, lon } : { lat: null, lon: null };
}

function phoneOf(v: unknown): string | null {
  if (v === null || typeof v !== 'object') return str(v);
  const p = v as { formatted?: unknown; number?: unknown };
  return str(p.formatted) ?? str(p.number);
}

export function toPlace(raw: RawItem, type: PlaceType): VjPlace {
  const acf = raw.acf ?? {};
  const a = (acf.address ?? {}) as Record<string, unknown>;
  const parishLabel = labelOf(acf.parish);
  const parish = parishLabel === null ? null : tidyParish(parishLabel);
  // "Jersey" on its own is not a second address line, it is the island;
  // and a line that just repeats the parish is not one either, or FLOUR
  // ends up at "6a Colomberie, St Helier, St Helier".
  const line2 = addressLine(a.address_line_2);
  const dropLine2 = line2 !== null
    && parish !== null && tidyParish(line2).toLowerCase() === parish.toLowerCase();
  const header = images(acf.header_image_data)[0] ?? null;

  return {
    externalId: String(raw.id),
    type,
    category: CATEGORY_OF[type],
    name: decodeEntities(raw.title?.rendered ?? '').trim(),
    addressLine1: addressLine(a.address_line_1),
    addressLine2: dropLine2 ? null : line2,
    postcode: str(a.postcode)?.toUpperCase() ?? null,
    parish,
    ...pin(acf),
    phone: phoneOf(acf.telephone_number),
    website: str(acf.website),
    email: str(acf.email_address),
    summary: htmlToText(acf.short_description),
    description: htmlToText(acf.long_description),
    facilities: labels(acf.key_facilities),
    accessibility: labels(acf.accessibility),
    openMonths: months(acf.seasonality),
    lowRatePence: pence(acf.low_season_rate),
    highRatePence: pence(acf.high_season_rate),
    aaRating: labelOf(acf.aa_rating) ?? labels(acf.aa_rating)[0] ?? null,
    ...(type === 'accommodation' ? { stayType: labels(Array.isArray(acf.type) ? acf.type : [acf.type])[0] ?? null } : {}),
    headerImage: header,
    gallery: images(acf.gallery_images_data),
    sourceLink: str(raw.link),
    modifiedAt: utc(raw.modified_gmt),
    portalSyncedAt: utc(acf.portal_last_synced),
  };
}

/** "20261231" or "31/12/2026" to "2026-12-31": event_dates and event_dates_start disagree. */
export function isoDate(v: unknown): string | null {
  const s = str(v);
  if (s === null) return null;
  const ymd = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(s);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : null;
}

export function toEvent(raw: RawItem): VjEvent {
  const acf = raw.acf ?? {};
  const dates: EventDate[] = [];
  if (Array.isArray(acf.event_dates)) {
    for (const d of acf.event_dates) {
      if (d === null || typeof d !== 'object') continue;
      const o = d as Record<string, unknown>;
      const date = isoDate(o.date);
      if (date !== null) dates.push({ date, start: str(o.start_time), end: str(o.end_time) });
    }
  }
  dates.sort((x, y) => x.date.localeCompare(y.date));
  const loc = acf.map_location as { address?: unknown } | undefined;
  const a = (acf.address ?? {}) as Record<string, unknown>;
  const parishLabel = labelOf(acf.parish);
  const fromRaw = acf.from_price;
  const free = (fromRaw === 0 || fromRaw === '0' || fromRaw === '0.00') && !pence(acf.price_to);

  return {
    externalId: String(raw.id),
    title: decodeEntities(raw.title?.rendered ?? '').trim(),
    summary: htmlToText(acf.short_description),
    description: htmlToText(acf.long_description),
    venue: tidyVenue(str(loc?.address) === null ? null : decodeEntities(str(loc?.address)!)),
    venueName: str(a.place_name) === null ? null : decodeEntities(str(a.place_name)!),
    addressLine1: addressLine(a.address_line_1),
    parish: parishLabel === null ? null : tidyParish(parishLabel),
    postcode: str(a.postcode)?.toUpperCase() ?? null,
    phone: phoneOf(acf.telephone_number),
    email: str(acf.email_address),
    website: str(acf.website),
    eventTypes: labels(acf.type),
    free,
    occurrence: classifyOccurrence(dates.map((x) => x.date), { starts: dates.map((x) => x.start) }),
    ...pin(acf),
    dates,
    startsOn: isoDate(acf.event_dates_start) ?? dates[0]?.date ?? null,
    endsOn: isoDate(acf.event_dates_end) ?? dates.at(-1)?.date ?? null,
    fromPricePence: pence(acf.from_price),
    toPricePence: pence(acf.price_to),
    headerImage: images(acf.header_image_data)[0] ?? null,
    gallery: images(acf.gallery_images_data),
    sourceLink: str(raw.link),
    modifiedAt: utc(raw.modified_gmt),
    portalSyncedAt: utc(acf.portal_last_synced),
  };
}

/**
 * A tour or experience. Shaped differently from an event: dates in
 * `dates`, prices in `price_from`, a duration, and the provider in
 * `display_name` with a link to their own listing.
 */
export type VjExperience = {
  externalId: string;
  title: string;
  provider: string | null;
  /** The provider's own directory listing, where the tour links one. */
  providerListingId: string | null;
  summary: string | null;
  description: string | null;
  duration: string | null;
  tags: string[];
  genre: Genre | null;
  dates: EventDate[];
  occurrence: Occurrence;
  fromPricePence: number | null;
  toPricePence: number | null;
  meetingPoint: string | null;
  parish: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  lat: number | null;
  lon: number | null;
  headerImage: Image | null;
  gallery: Image[];
  sourceLink: string | null;
  modifiedAt: Date | null;
  portalSyncedAt: Date | null;
};

function readDates(v: unknown): EventDate[] {
  const out: EventDate[] = [];
  if (!Array.isArray(v)) return out;
  for (const d of v) {
    if (d === null || typeof d !== 'object') continue;
    const o = d as Record<string, unknown>;
    const date = isoDate(o.date);
    if (date !== null) out.push({ date, start: str(o.start_time), end: str(o.end_time) });
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}

export function toExperience(raw: RawItem): VjExperience {
  const acf = raw.acf ?? {};
  const title = decodeEntities(raw.title?.rendered ?? '').trim();
  const tags = [...labels(Array.isArray(acf.type) ? acf.type : [acf.type]), ...labels(acf.sub_type)];
  const dates = readDates(acf.dates);
  const loc = acf.map_location as { name?: unknown; address?: unknown } | undefined;
  const linked = Array.isArray(acf.associate_with_listing) ? (acf.associate_with_listing[0] as { ID?: unknown } | undefined) : undefined;
  const provider = str(acf.display_name) ?? str(acf.portal_post_owner_name);
  const parishLabel = labelOf(acf.parish);
  return {
    externalId: String(raw.id),
    title,
    provider: provider === null ? null : decodeEntities(provider).trim(),
    providerListingId: linked?.ID === undefined ? null : String(linked.ID),
    summary: htmlToText(acf.short_description),
    description: htmlToText(acf.long_description),
    // "3-5 hrs," arrives with a trailing comma on some listings.
    duration: labelOf(acf.duration)?.replace(/[,\s]+$/, '') ?? null,
    tags,
    genre: suggestGenre(title, tags),
    dates,
    occurrence: classifyOccurrence(dates.map((x) => x.date), { tour: true, starts: dates.map((x) => x.start) }),
    fromPricePence: pence(acf.price_from ?? acf.from_price),
    toPricePence: pence(acf.price_to),
    meetingPoint: str(loc?.name) ?? str(loc?.address),
    parish: parishLabel === null ? null : tidyParish(parishLabel),
    phone: phoneOf(acf.telephone_number),
    email: str(acf.email_address),
    website: str(acf.website),
    ...pin(acf),
    headerImage: images(acf.header_image_data)[0] ?? null,
    gallery: images(acf.gallery_images_data),
    sourceLink: str(raw.link),
    modifiedAt: utc(raw.modified_gmt),
    portalSyncedAt: utc(acf.portal_last_synced),
  };
}

export function isListingType(s: string): s is ListingType {
  return s === 'events' || s === 'tours-and-activities' || (CATEGORY_OF as Record<string, unknown>)[s] !== undefined;
}
