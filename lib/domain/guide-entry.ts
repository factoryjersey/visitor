import type { Event, Experience, Place, Provider } from '@/lib/db/schema';
import { webImage } from './images';
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
  /** A web-sized copy of the picture for the on-screen proof; the export keeps the original. Not printed. */
  preview: string;
};

export type Window = { from: string; to: string };

/**
 * Room in an event's printed frame, 2026 layout: a 45.5 × 70mm cell
 * holding a 16mm picture, the date line, the title, the copy and the
 * venue block. Line counts are estimated from characters at the
 * frame's width, a little short of the real figure so that what fits here
 * fits in InDesign too.
 */
const FRAME_MM = 70;
const LINE = { date: 3.6, title: 3.4, copy: 3.24, small: 2.75 };
const PER_LINE = { date: 30, title: 30, copy: 34, small: 40 };
const lines = (text: string, per: number) => (text ? Math.ceil(text.length / per) : 0);

export function copyBudget(e: { dates: string; times: string; title: string; price: string; venue: string; address: string; contact: string; website: string }): number {
  const used =
    18.7 + // the picture, its rule and the space under it
    lines(`${e.dates}  ${e.times}`.trim(), PER_LINE.date) * LINE.date +
    lines(e.title, PER_LINE.title) * LINE.title + 0.5 +
    (e.venue ? 2.2 + lines(e.venue, PER_LINE.small) * LINE.small : 0) +
    lines(e.address, PER_LINE.small) * LINE.small +
    lines(e.contact, PER_LINE.small) * LINE.small +
    (e.website ? 1.4 + lines(e.website, PER_LINE.small) * LINE.small : 0);
  const copyLines = Math.max(1, Math.floor((FRAME_MM - used) / LINE.copy));
  return copyLines * PER_LINE.copy - (e.price ? e.price.length + 1 : 0);
}

/**
 * Copy cut to its frame: as many whole sentences as fit, and if not even
 * the first does, its words up to the room left and an ellipsis.
 */
export function fitCopy(text: string, budget: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= budget) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [clean];
  let out = '';
  for (const s of sentences) {
    const next = `${out} ${s.trim()}`.trim();
    if (next.length > budget) break;
    out = next;
  }
  if (out) return out;
  const words = clean.split(' ');
  let cut = '';
  for (const w of words) {
    if (`${cut} ${w}`.trim().length > budget - 1) break;
    cut = `${cut} ${w}`.trim();
  }
  return `${cut.replace(/[,;:–-]+$/, '')}…`;
}

/**
 * The copy a frame prints. Ours, when it fits, as an editor wrote it for
 * print. Otherwise the fullest that fits in whole sentences: the
 * description cut at a sentence, or the card's one-sentence version,
 * whichever says more. Only if neither fits whole is a sentence cut.
 */
export function printCopy(e: { guideCopy: string | null; summary: string | null; description: string | null }, budget: number): string {
  const tidy = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();
  const ours = tidy(e.guideCopy);
  if (ours && ours.length <= budget) return ours;
  const whole = [ours, tidy(e.description), tidy(e.summary)]
    .filter(Boolean)
    .map((t) => fitCopy(t, budget))
    .filter((t) => !t.endsWith('…'));
  if (whole.length) return whole.sort((a, b) => b.length - a.length)[0]!;
  return fitCopy(tidy(e.summary) || ours || tidy(e.description), budget);
}

/** Sites that sell for everyone: in print they say nothing about the event. */
const TICKET_PLATFORMS = /(^|\.)(eventbrite\.[a-z.]+|ticketsolve\.com|ticketsource\.co\.uk|islandtickethut\.com|jersey\.com|skiddle\.com|ticketmaster\.[a-z.]+|seetickets\.com|bulls\.je\/event)$/i;

/**
 * The address the guide prints: the event's own, unless that is a ticket
 * platform and the venue has a site of its own, which a reader can type
 * and remember.
 */
export function guideWebsite(eventSite: string | null, venueSite: string | null): string | null {
  if (!eventSite) return venueSite;
  let host = '';
  try {
    host = new URL(/^https?:/i.test(eventSite) ? eventSite : `https://${eventSite}`).hostname.replace(/^www\./, '');
  } catch {
    return eventSite;
  }
  return TICKET_PLATFORMS.test(host) && venueSite ? venueSite : eventSite;
}

export function guideEvent(e: Event, venue: Pick<Place, 'name' | 'addressLine1' | 'parish' | 'postcode' | 'phone' | 'website'> | null, window?: Window): GuideEvent | null {
  const inside = e.dates.filter((d) => !window || (d.date >= window.from && d.date <= window.to));
  const dates = e.printDates ?? printDates(e.dates, window);
  // Not on during this edition, and nobody has said otherwise.
  if (!dates) return null;

  const address = e.addressLine1 || e.parish
    ? printAddress(e)
    : venue ? printAddress(venue) : null;

  const entry = {
    dates,
    times: e.printTimes ?? printTimes(inside.length ? inside : e.dates) ?? '',
    title: e.title,
    price: e.printPrice ?? printPrice(e.fromPricePence, e.toPricePence, { free: e.free }) ?? '',
    venue: e.venueName ?? venue?.name ?? e.venue?.split(',')[0] ?? '',
    address: address ?? '',
    contact: printContact(e.phone ?? venue?.phone ?? null, e.email) ?? '',
    website: printWebsite(guideWebsite(e.website, venue?.website ?? null)) ?? '',
    // A stock picture is for the web only: print uses the listing's own or none.
    imageUrl: e.headerImage && !e.headerImage.credit ? e.headerImage.url : '',
    preview: e.headerImage && !e.headerImage.credit ? webImage(e.headerImage, 520, 182) : '',
    block: (UNIQUE.includes(e.occurrence) ? 'dated' : 'all season') as GuideEvent['block'],
    highlight: e.highlight,
    extendedCopy: e.guideCopy ?? e.description ?? e.summary ?? '',
    sortKey: inside[0]?.date ?? e.startsOn ?? '',
  };
  return { ...entry, copy: printCopy(e, copyBudget(entry)) };
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
