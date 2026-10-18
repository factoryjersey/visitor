import type { Event, Place } from '@/lib/db/schema';
import {
  printAddress,
  printContact,
  printDates,
  printPrice,
  printTimes,
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
    imageUrl: e.headerImage?.url ?? '',
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
