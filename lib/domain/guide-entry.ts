import type { Event, Experience, Place, Provider } from '@/lib/db/schema';
import { UNIQUE } from './occurrence';
import {
  printAddress,
  printContact,
  printDates,
  printPrice,
  printTimes,
  printTourDates,
  printWebsite,
} from './house-style';

/**
 * One What's On entry, field by field, as the guide prints it. The page
 * preview and the InDesign Data Merge export both read this, so what is
 * proofed on screen is what lands in the layout.
 */
export type GuideEvent = {
  dates: string;
  times: string;
  title: string;
  copy: string;
  price: string;
  venue: string;
  address: string;
  contact: string;
  website: string;
  imageUrl: string;
  /** Unique events print in date order; ongoing and regular ones in their own block first. */
  block: 'dated' | 'all season';
  /** A full page of its own: the extended listing and a large image. */
  highlight: boolean;
  /** The long copy a highlight prints: ours, else the listing's full description. */
  extendedCopy: string;
  /** The first date inside the edition, for ordering. Not printed. */
  sortKey: string;
};

export type Window = { from: string; to: string };

export function guideEvent(e: Event, venue: Pick<Place, 'name' | 'addressLine1' | 'parish' | 'postcode' | 'phone' | 'website'> | null, window?: Window): GuideEvent | null {
  const inside = e.dates.filter((d) => !window || (d.date >= window.from && d.date <= window.to));
  const dates = e.printDates ?? printDates(e.dates, window);
  // Not on during this edition, and nobody has said otherwise.
  if (!dates) return null;

  const address = e.addressLine1 || e.parish
    ? printAddress(e)
    : venue ? printAddress(venue) : null;

  return {
    dates,
    times: e.printTimes ?? printTimes(inside.length ? inside : e.dates) ?? '',
    title: e.title,
    copy: e.guideCopy ?? e.summary ?? '',
    price: e.printPrice ?? printPrice(e.fromPricePence, e.toPricePence, { free: e.free }) ?? '',
    venue: e.venueName ?? venue?.name ?? e.venue?.split(',')[0] ?? '',
    address: address ?? '',
    contact: printContact(e.phone ?? venue?.phone ?? null, e.email) ?? '',
    website: printWebsite(e.website ?? venue?.website ?? null) ?? '',
    // A stock picture is for the web only: print uses the listing's own or none.
    imageUrl: e.headerImage && !e.headerImage.credit ? e.headerImage.url : '',
    block: UNIQUE.includes(e.occurrence) ? 'dated' : 'all season',
    highlight: e.highlight,
    extendedCopy: e.guideCopy ?? e.description ?? e.summary ?? '',
    sortKey: inside[0]?.date ?? e.startsOn ?? '',
  };
}

/** The current season if none is chosen: today to three months on. */
export function defaultWindow(today = new Date()): Window {
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 3, 0));
  return { from: today.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** One venue as the guide prints it: in a section and area, under its label. */
export type GuideVenue = {
  section: string;
  area: string;
  name: string;
  label: string;
  size: string;
  copy: string;
  address: string;
  phone: string;
  website: string;
  imageUrl: string;
};

const SECTION_OF_CATEGORY: Record<Place['category'], string> = {
  stay: 'Stay', 'eat-drink': 'Eat', see: 'See', do: 'Do', shop: 'Buy',
};

export function guideVenue(p: Place): GuideVenue {
  return {
    section: p.guideSection ?? SECTION_OF_CATEGORY[p.category],
    area: p.guideArea ?? '',
    name: p.name,
    label: (p.guideLabel ?? '').toUpperCase(),
    size: p.listingSize,
    // A directory line has no copy; the bigger entries do.
    copy: p.listingSize === 'directory' ? '' : p.guideCopy ?? p.summary ?? '',
    address: [p.addressLine1, printAddress({ addressLine1: null, parish: p.parish, postcode: null })].filter(Boolean).join(', '),
    phone: p.phone ?? '',
    website: printWebsite(p.website) ?? '',
    imageUrl: p.headerImage?.url ?? '',
  };
}

/**
 * One tour as the guide prints it. Dated tours (one-off, specific dates)
 * carry their dates; on-demand ones (regular, bookable any day) print
 * under their genre without dates. From the autumn 2026 pages:
 *
 *   1/8/15/22/29 Sep, 6 Oct  Beach Blokarting  AA  1-2 hrs  If you're looking for…
 *   Arena Paintball  VAC  1-2 hrs  Arena Paintball is a high octane…
 */
export type GuideTour = {
  kind: 'dated' | 'on demand';
  genre: string;
  dates: string;
  title: string;
  code: string;
  provider: string;
  duration: string;
  times: string;
  copy: string;
  sortKey: string;
};

export function guideTour(
  x: Experience,
  provider: Pick<Provider, 'name' | 'code'> | null,
  window?: Window,
): GuideTour | null {
  const inside = x.dates.filter((d) => !window || (d.date >= window.from && d.date <= window.to));
  const dated = UNIQUE.includes(x.occurrence);
  const dates = dated ? x.printDates ?? printTourDates(x.dates, window) : '';
  // A dated tour with no dates in this edition is not in it; an on-demand
  // one is, if it runs at all during the edition or lists no dates.
  if (dated && !dates) return null;
  if (!dated && x.dates.length > 0 && inside.length === 0 && !x.printDates) return null;

  const times = x.printTimes ?? printTimes(inside.length ? inside : x.dates) ?? '';
  return {
    kind: dated ? 'dated' : 'on demand',
    genre: x.genre ?? '',
    dates: dates ?? '',
    title: x.title,
    code: provider?.code ?? '',
    provider: provider?.name ?? '',
    duration: x.duration ?? '',
    // Bookable all day at many times reads as noise in print; leave it to the provider.
    times: times.split(/ \| |, /).length > 2 ? '' : times,
    copy: x.guideCopy ?? x.summary ?? '',
    sortKey: inside[0]?.date ?? '',
  };
}
