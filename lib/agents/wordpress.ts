import type { Event, Image } from '@/lib/db/schema';

/**
 * Our events in the shape Visit Jersey's own site gives its listings: the
 * WordPress REST API's post, with an ACF block of the same field names
 * (event_dates, address, parish, map_location, header_image_data…), so
 * whatever reads jersey.com's /wp-json/wp/v2/events can read ours the
 * same way. Ours added under guide_ names. Pure: the route fetches.
 */

const SITE = 'https://guide.je';

/** The source names as people know them, for the guide_sources field. */
const SOURCE_NAME: Record<string, string> = {
  visit_jersey: 'jersey.com',
  'ticketsolve-artscentre': 'Jersey Arts Centre',
  'ticketsolve-operahouse': 'Jersey Opera House',
  eventbrite: 'Eventbrite',
  'jersey-charities': 'Jersey Charities',
  'island-ticket-hut': 'Island Ticket Hut',
  gigzhub: 'Gigz Hub',
  'jersey-bulls': 'Jersey Bulls',
  'jersey-rfc': 'Jersey RFC',
};

/** Kinds that are ours to sort by, not anyone's to read. */
const HIDDEN_TYPES = new Set(['Business & networking']);

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "Arts & cultural" to "arts-cultural", as their values are spelled. */
export const wpValue = (label: string) =>
  label.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const option = (label: string) => ({ label, value: wpValue(label) });

/** A stable whole number for an id, as WordPress's are: from the start of our UUID. */
export const wpId = (uuid: string) => parseInt(uuid.replace(/-/g, '').slice(0, 12), 16);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Plain words as their HTML fields hold them: a paragraph each, a newline after. */
const paragraphs = (s: string | null | undefined) =>
  (s ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br />\n')}</p>\n`).join('');

/** "2026-11-27" to "20261127" (event_dates) and "27/11/2026" (event_dates_start and _end). */
const compact = (iso: string) => iso.replace(/-/g, '');
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const pounds = (pence: number | null) => (pence === null ? '' : String(Math.round(pence) / 100));
/** "2026-10-21T13:33:27" in their local and GMT fields: no zone, no milliseconds. */
const wpTime = (d: Date) => d.toISOString().slice(0, 19);

/** Pictures as their *_image_data fields hold them: a JSON string. Stock pictures are licensed to us, not to pass on. */
function imageData(images: (Image | null | undefined)[]): string {
  const own = images.filter((i): i is Image => !!i && !i.credit);
  return own.length ? JSON.stringify(own.map((i) => ({ url: i.url, public_id: i.publicId ?? '', alt_text: i.alt ?? '', original_filename: i.originalFilename ?? '' }))) : '';
}

export type WpEventRow = Pick<
  Event,
  | 'id' | 'slug' | 'title' | 'summary' | 'description' | 'guideCopy' | 'venue' | 'venueName' | 'addressLine1' | 'parish' | 'postcode' | 'phone' | 'email'
  | 'website' | 'eventTypes' | 'free' | 'lat' | 'lon' | 'dates' | 'fromPricePence' | 'toPricePence' | 'headerImage' | 'gallery' | 'sourceLink' | 'organiser'
  | 'createdAt' | 'updatedAt'
> & { venuePlaceName?: string | null };

/** One event as a jersey.com events post. `sources`: where it came from; `jerseyComId`: their post's id, when it is theirs too. */
export function wpEvent(e: WpEventRow, { sources = [], jerseyComId = null }: { sources?: string[]; jerseyComId?: string | null } = {}) {
  const dates = [...e.dates].sort((a, b) => a.date.localeCompare(b.date));
  const first = dates[0]?.date ?? null;
  const last = dates.at(-1)?.date ?? null;
  const months = [...new Set(dates.map((d) => Number(d.date.slice(5, 7)) - 1))].sort((a, b) => a - b);
  const place = e.venueName ?? e.venuePlaceName ?? e.venue ?? '';
  const link = `${SITE}/whats-on/${e.slug}`;
  return {
    id: wpId(e.id),
    date: wpTime(e.createdAt),
    date_gmt: wpTime(e.createdAt),
    modified: wpTime(e.updatedAt),
    modified_gmt: wpTime(e.updatedAt),
    guid: { rendered: link },
    lang: 'en',
    link,
    slug: e.slug,
    status: 'publish',
    type: 'events',
    title: { rendered: esc(e.title) },
    post_type_label: 'Event',
    acf: {
      uuid: e.id,
      title: e.title,
      type: e.eventTypes.filter((t) => !HIDDEN_TYPES.has(t)).map(option),
      parish: e.parish ? option(e.parish) : '',
      address: { place_name: place, address_line_1: e.addressLine1 ?? '', address_line_2: 'Jersey', postcode: e.postcode ?? '' },
      website: e.website ?? '',
      from_price: e.free ? '0' : pounds(e.fromPricePence),
      price_to: e.free ? '' : pounds(e.toPricePence),
      booking_information: e.free ? [{ label: 'Free entry', value: 'free-entry' }] : [],
      event_dates: dates.map((d) => ({ date: compact(d.date), start_time: d.start ?? '', end_time: d.end ?? '' })),
      event_dates_start: first ? dmy(first) : '',
      event_dates_end: last ? dmy(last) : '',
      seasonality: months.map((m) => ({ label: MONTHS[m]!.charAt(0).toUpperCase() + MONTHS[m]!.slice(1), value: MONTHS[m]! })),
      map_location: e.lat !== null && e.lon !== null ? { lat: e.lat, lng: e.lon, name: place, address: [place, e.addressLine1, e.parish, 'Jersey'].filter(Boolean).join(', '), country: 'Jersey', country_short: 'JE', post_code: e.postcode ?? '' } : '',
      map_location_lat: e.lat !== null ? String(e.lat) : '',
      map_location_lng: e.lon !== null ? String(e.lon) : '',
      telephone_number: e.phone ? { area_code: '', prefix: '', number: '', formatted: e.phone } : '',
      email_address: e.email ?? '',
      display_name: e.organiser ?? '',
      short_description: paragraphs(e.summary ?? e.guideCopy),
      long_description: paragraphs(e.description),
      header_image_data: imageData([e.headerImage]),
      gallery_images_data: imageData(e.gallery ?? []),
      bus_routes: [],
      // Ours: where to see it on guide.je, where it came from, and their own post when it is theirs too.
      guide_url: link,
      guide_source_link: e.sourceLink ?? '',
      guide_sources: sources.map((s) => SOURCE_NAME[s] ?? s),
      jersey_com_id: jerseyComId ? Number(jerseyComId) : null,
    },
  };
}

export type WpEvent = ReturnType<typeof wpEvent>;
