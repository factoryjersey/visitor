import type { Event, Experience, Place } from '@/lib/db/schema';
import { printAddress, printParish, printPrice } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { upcomingDates, webWhen } from '@/lib/domain/web-dates';

/**
 * What's on as agents and other programs read it: the API, the MCP
 * server, the Markdown pages and llms-full.txt all describe a listing the
 * same way, in plain fields, with the guide's own wording for dates and
 * prices beside the machine-readable ones.
 */

export const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://visitor.je').replace(/\/$/, '');
export const SITE_NAME = 'Visitor';
export const SITE_TITLE = 'Visitor: Jersey’s What’s On Guide';
export const SITE_ABOUT =
  'Visitor (visitor.je) is the website of the official Visit Jersey Visitor Guide, printed four times a year. It lists what is on in Jersey, Channel Islands: events, tours and experiences, venues and organisers, gathered daily from Visit Jersey, the island’s theatres, Eventbrite, the Jersey Charities diary and the clubs, and checked by the guide’s editors.';

/** Staff-only kinds: never shown to the public. */
const HIDDEN_TYPES = new Set(['Business & networking']);

type VenueRef = { name: string; slug: string; parish: string | null } | null;

export function eventOut(e: Event, venue: VenueRef | Pick<Place, 'name' | 'slug' | 'parish'>, today: string) {
  const dates = upcomingDates(e.dates, today);
  const times = e.dates.filter((d) => d.date >= today);
  return {
    slug: e.slug,
    url: `${SITE}/whats-on/${e.slug}`,
    title: e.title,
    summary: e.summary ?? e.guideCopy ?? null,
    description: e.description ?? null,
    kinds: e.eventTypes.filter((t) => !HIDDEN_TYPES.has(t)),
    when: webWhen(e.dates, e.occurrence, today),
    next: dates[0] ?? null,
    dates: times.map((d) => ({ date: d.date, start: d.start, end: d.end })),
    occurrence: e.occurrence,
    venue: e.venueName ?? venue?.name ?? e.venue ?? null,
    venueUrl: venue?.slug ? `${SITE}/venues/${venue.slug}` : null,
    parish: printParish(e.parish ?? venue?.parish ?? null),
    address: e.addressLine1 || e.parish ? printAddress(e) : null,
    price: printPrice(e.fromPricePence, e.toPricePence, { free: e.free }),
    free: e.free,
    fromPricePence: e.fromPricePence,
    toPricePence: e.toPricePence,
    organiser: e.organiser ?? null,
    tickets: e.website ?? e.sourceLink ?? null,
    image: e.headerImage ? webImage(e.headerImage, 1200, 800) : null,
    lat: e.lat,
    lon: e.lon,
  };
}

export type EventOut = ReturnType<typeof eventOut>;

export function tourOut(t: Experience, provider: { name: string; website?: string | null } | null, today: string) {
  return {
    slug: t.slug,
    url: `${SITE}/tours/${t.slug}`,
    title: t.title,
    summary: t.summary ?? t.guideCopy ?? null,
    description: t.description ?? null,
    kind: t.genre,
    when: webWhen(t.dates, t.occurrence, today),
    next: upcomingDates(t.dates, today)[0] ?? null,
    occurrence: t.occurrence,
    bookableAnyDay: t.occurrence === 'ongoing',
    duration: t.duration,
    meetingPoint: t.meetingPoint,
    parish: printParish(t.parish),
    price: printPrice(t.fromPricePence, t.toPricePence),
    fromPricePence: t.fromPricePence,
    toPricePence: t.toPricePence,
    runBy: provider?.name ?? null,
    book: t.website ?? provider?.website ?? null,
    image: t.headerImage ? webImage(t.headerImage, 1200, 800) : null,
    lat: t.lat,
    lon: t.lon,
  };
}

export type TourOut = ReturnType<typeof tourOut>;

export function venueOut(v: Pick<Place, 'slug' | 'name' | 'parish' | 'addressLine1' | 'postcode' | 'website' | 'phone' | 'summary' | 'lat' | 'lon'> & { guideCopy?: string | null }, upcoming?: number) {
  return {
    slug: v.slug,
    url: `${SITE}/venues/${v.slug}`,
    name: v.name,
    // Our guide's words first, the source's otherwise.
    summary: v.guideCopy ?? v.summary ?? null,
    parish: printParish(v.parish),
    address: printAddress(v),
    website: v.website,
    phone: v.phone,
    lat: v.lat,
    lon: v.lon,
    ...(upcoming === undefined ? {} : { upcomingEvents: upcoming }),
  };
}

/** One listing as a Markdown line, for lists. */
export const eventLine = (e: EventOut) =>
  `- [${e.title}](${e.url}): ${[e.when, e.venue, e.price].filter(Boolean).join(' · ')}${e.summary ? `. ${e.summary}` : ''}`;

export const tourLine = (t: TourOut) =>
  `- [${t.title}](${t.url}): ${[t.bookableAnyDay ? 'any day' : t.when, t.runBy, t.price].filter(Boolean).join(' · ')}${t.summary ? `. ${t.summary}` : ''}`;

/** A page's own address, and its Markdown version for agents. */
export const alternates = (path: string) => ({ canonical: path, types: { 'text/markdown': path === '/' ? '/index.md' : `${path}.md` } });
