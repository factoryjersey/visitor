/**
 * Visit Jersey's directory, read through its WordPress REST API.
 *
 * Ported from factoryOS (lib/integrations/jersey-com/directory.ts) and
 * widened from "somewhere a van can deliver" to everything a visitor
 * guide prints: copy, rates, months open, facilities, images, events.
 * The traps are the same and are written up in docs/visit-jersey.md.
 *
 * Read-only, public, and paged politely. `lang=en` is not optional:
 * without it every place arrives two or three times with different ids
 * and the same pin.
 */

const BASE = 'https://www.jersey.com/wp-json/wp/v2';

/** A real contact, as asked of any API consumer. */
const USER_AGENT = 'Factory visitor guide (ben@factory.je)';

/** Listing types that are places: somewhere with a front door. */
export const PLACE_TYPES = [
  'accommodation',
  'food-and-drink',
  'attractions',
  'activities',
  'shopping-and-markets',
  'tour-operators',
  'points-of-interest',
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number] | 'tours-and-activities';
/** Tours are experiences, not places: a provider's product, on dates or on demand. */
export type ListingType = PlaceType | 'events';

export type RawItem = {
  id: number;
  link?: string;
  modified_gmt?: string;
  title?: { rendered?: string };
  // Somebody else's schema, typed loosely on purpose: it will change
  // without telling us, and a renamed field should read as missing
  // rather than fail the whole import.
  acf?: Record<string, unknown>;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every listing of one type, as the API gives them. */
export async function fetchRawListings(
  type: ListingType,
  onPage?: (n: number, of: number) => void,
): Promise<RawItem[]> {
  const out: RawItem[] = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const url = `${BASE}/${type}?lang=en&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      // A type with nothing in it answers 400 past the last page rather
      // than an empty list, which is not an error worth stopping for.
      if (res.status === 400) break;
      throw new Error(`jersey.com ${type} page ${page}: ${res.status} ${res.statusText}`);
    }
    pages = Number(res.headers.get('x-wp-totalpages') ?? '1') || 1;
    onPage?.(page, pages);

    out.push(...((await res.json()) as RawItem[]));
    page += 1;
    // Somebody else's server; no reason to hurry it.
    if (page <= pages) await wait(300);
  }
  return out;
}
