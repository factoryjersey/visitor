import type { Event, Experience, ListingSize, Place, Provider } from '@/lib/db/schema';
import { isNewVenue } from './new-venue';
import { webImage } from './images';
import { UNIQUE } from './occurrence';
import {
  printAddress,
  printContact,
  printDates,
  printPrice,
  printTimes,
  printTourDates,
  printTitle,
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
  /** A charity or community event: listed, but a picture slot goes to something else first. Not printed. */
  community: boolean;
  /** The copy cut for each frame it might take, a picture cell's or a listing's; the page layout picks. Not printed. */
  fits: { picture: string; listing: string };
  /** Which frame it takes on its page, set by the page layout: a pictured cell, a listing, or (in the grid) the picture box beside its listing. */
  frame: 'picture' | 'listing' | 'image';
  /** Staff chose its picture for the grid's picture box, ahead of the rest on its page. Not printed. */
  guidePicture: boolean;
  /** Its kinds, which the page prints as key icons. */
  types: string[];
  /** Every whole-sentence version of the copy, fullest first: the proof measures its frame and prints the first that fits. Not printed. */
  options: string[];
};

export type Window = { from: string; to: string };

/**
 * The frames an event prints in, six to a page: a top row of two 45.5 ×
 * 52mm cells with a 16mm picture, then four 45.5 × 43mm listings without.
 * The 2026 editions' 70mm picture cell is the default.
 */
export type Frame = { height: number; picture: boolean };
export const FRAMES = { picture: { height: 52, picture: true }, listing: { height: 43, picture: false } } as const satisfies Record<string, Frame>;

/**
 * Room in an event's printed frame: the picture if it has one, the date
 * line, the title, the copy and the venue block. Line counts are estimated from characters at the
 * frame's width, a little short of the real figure so that what fits here
 * fits in InDesign too.
 */
const LINE = { date: 3.6, title: 3.4, copy: 3.24, small: 2.75 };
const PER_LINE = { date: 30, title: 30, copy: 32, small: 40 };
const lines = (text: string, per: number) => (text ? Math.ceil(text.length / per) : 0);

export function copyBudget(e: { dates: string; times: string; title: string; price: string; venue: string; address: string; contact: string; website: string }, frame: Frame = { height: 70, picture: true }): number {
  const used =
    (frame.picture ? 18.7 : 2) + // the picture, its rule and the space under it; a listing's rule
    lines(`${e.dates}  ${e.times}`.trim(), PER_LINE.date) * LINE.date +
    lines(e.title, PER_LINE.title) * LINE.title + 0.5 +
    (e.venue ? 2.2 + lines(e.venue, PER_LINE.small) * LINE.small : 0) +
    lines(e.address, PER_LINE.small) * LINE.small +
    lines(e.contact, PER_LINE.small) * LINE.small +
    (e.website ? 1.4 + lines(e.website, PER_LINE.small) * LINE.small : 0);
  const copyLines = Math.max(0, Math.floor((frame.height - used) / LINE.copy));
  return copyLines ? copyLines * PER_LINE.copy - (e.price ? e.price.length + 1 : 0) : 0;
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
 * description cut at a sentence, the card's one-sentence version, or the
 * print line written to fit the smallest frame, whichever says more. Only if neither fits whole is a sentence cut.
 */
export function printCopy(e: { guideCopy: string | null; summary: string | null; description: string | null; printLine?: string | null }, budget: number): string {
  // No room for a line of copy: the dates, title and venue say it.
  if (budget <= 0) return '';
  return copyOptions(e).find((c) => c.length <= budget) ?? '';
}

/**
 * The copy a frame could print, in order of preference: ours whole, then
 * every whole-sentence version of ours, the description, the card
 * sentence and the print line, fullest first, then none.
 */
export function copyOptions(e: { guideCopy: string | null; summary: string | null; description: string | null; printLine?: string | null }): string[] {
  const tidy = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
  const ours = tidy(e.guideCopy);
  const snippet = tidy(e.printLine);
  // The snippet sums the listing up for print: whole, or its first sentence alone.
  const texts = snippet ? [snippet] : [tidy(e.description), tidy(e.summary)];
  const prefixes = new Set<string>();
  for (const text of [ours, ...texts]) {
    let out = '';
    for (const s of sentences(text)) {
      out = `${out} ${s}`.trim();
      if (out.length > 600) break;
      if (!trailsOff(out)) prefixes.add(out);
    }
  }
  return [...new Set([...(ours ? [ours] : []), ...[...prefixes].sort((a, b) => b.length - a.length), ''])];
}

/** Copy the source cut short ("…", "..."): never printed. */
const trailsOff = (t: string) => /(\.\.|…)\s*$/.test(t) || /(\.\.|…)\s/.test(t);
/** A full stop that ends a short form, not a sentence: "St. Helier", "Dr. Smith", "e.g. this". */
const SHORT_FORM = /(?:^|\s)(?:St|Ste|Mt|Dr|Mr|Mrs|Ms|No|Nos|approx|e\.g|i\.e|vs|[A-Z])\.$/;
function sentences(t: string): string[] {
  const out: string[] = [];
  for (const piece of (t.match(/[^.!?…]+(?:[.!?…]+|$)(?=\s|$)/g) ?? []).map((s) => s.trim()).filter(Boolean)) {
    const last = out.at(-1);
    // Glued back on: after a short form, or when what follows starts in lower case.
    if (last && (SHORT_FORM.test(last) || /^[a-z0-9]/.test(piece))) out[out.length - 1] = `${last} ${piece}`;
    else out.push(piece);
  }
  return out;
}

/**
 * A picture the guide prints: the listing's own (not stock or a club's
 * photograph we credit), and not a poster or flyer, which crops badly.
 */
const printable = (image: Event['headerImage']) => !!image && !image.credit && !(image.text && image.text.url === image.url && image.text.found);

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
    title: printTitle(e.title),
    price: e.printPrice ?? printPrice(e.fromPricePence, e.toPricePence, { free: e.free }) ?? '',
    venue: e.venueName ?? venue?.name ?? e.venue?.split(',')[0] ?? '',
    address: address ?? '',
    contact: printContact(e.phone ?? venue?.phone ?? null, e.email) ?? '',
    website: printWebsite(guideWebsite(e.website, venue?.website ?? null)) ?? '',
    // Stock, credited and poster pictures are for the web only: print uses the listing's own photograph or none.
    imageUrl: printable(e.headerImage) ? e.headerImage!.url : '',
    preview: printable(e.headerImage) ? webImage(e.headerImage!, 520, 182) : '',
    block: (UNIQUE.includes(e.occurrence) ? 'dated' : 'all season') as GuideEvent['block'],
    highlight: e.highlight,
    extendedCopy: e.guideCopy ?? e.description ?? e.summary ?? '',
    sortKey: inside[0]?.date ?? e.startsOn ?? '',
  };
  const fits = { picture: printCopy(e, copyBudget(entry, FRAMES.picture)), listing: printCopy(e, copyBudget(entry, FRAMES.listing)) };
  const community = e.eventTypes.includes('Charity');
  return { ...entry, community, guidePicture: e.guidePicture, types: e.eventTypes, fits, frame: 'listing', copy: fits.listing, options: copyOptions(e) };
}

/**
 * How What's On is laid out. 'top': six to a page, a pictured pair across
 * the top. 'grid6' and 'grid8': six or eight equal boxes, two across,
 * every listing without a picture and one box a picture beside the listing it belongs to.
 */
export const LAYOUTS = ['top', 'grid6', 'grid8'] as const;
export type Layout = (typeof LAYOUTS)[number];
export const layoutFrom = (v: string | null | undefined): Layout => (LAYOUTS as readonly string[]).includes(v ?? '') ? (v as Layout) : 'top';

export const PER_PAGE = 6;
const PICTURES_PER_PAGE = 2;
/** Its copy would be cut mid-sentence, or dropped, in a picture cell. */
const cut = (e: GuideEvent) => !e.fits.picture || e.fits.picture.endsWith('…');

/** The grid's boxes: 142.4mm of page, rows 2mm apart. */
export const GRID = { grid6: { cells: 6, height: 46 }, grid8: { cells: 8, height: 34 } } as const;

/**
 * Events onto pages in date order, as the layout asks. Top: six at a
 * time; on each page the two with the strongest claim to a picture take
 * the top row: one with its own picture, not a community event unless
 * nothing else has one, and one whose copy fits the smaller frame in
 * whole sentences before one that would be cut. The rest follow as
 * listings, still in date order.
 *
 * Grid: five or seven listings a page and a picture box in the same row
 * as its listing, to its right, so that the reader sees whose picture it
 * is; a listing in the right-hand column swaps with the one before it. The
 * picture is the one staff chose, else the first with its own picture
 * that is not a community event, else any. A page with no picture to show
 * takes one more listing instead.
 */
export function layoutEvents(events: GuideEvent[], layout: Layout = 'top'): GuideEvent[][] {
  if (layout !== 'top') return gridEvents(events, GRID[layout]);
  const pages: GuideEvent[][] = [];
  for (let i = 0; i < events.length; i += PER_PAGE) {
    const page = events.slice(i, i + PER_PAGE);
    const ranked = page
      .map((e, at) => ({ e, at }))
      .filter(({ e }) => e.imageUrl)
      .sort((a, b) => Number(a.e.community) - Number(b.e.community) || Number(cut(a.e)) - Number(cut(b.e)) || a.at - b.at)
      .slice(0, PICTURES_PER_PAGE)
      .sort((a, b) => a.at - b.at)
      .map(({ e }) => e);
    const pictured = new Set(ranked);
    pages.push([
      ...ranked.map((e) => ({ ...e, frame: 'picture' as const, copy: e.fits.picture })),
      ...page.filter((e) => !pictured.has(e)).map((e) => ({ ...e, frame: 'listing' as const, copy: e.fits.listing })),
    ]);
  }
  return pages;
}

function gridEvents(events: GuideEvent[], grid: { cells: number; height: number }): GuideEvent[][] {
  const frame = { height: grid.height, picture: false };
  return gridPages(events, grid.cells, {
    listing: (e) => ({ ...e, frame: 'listing', copy: e.options.find((c) => c.length <= copyBudget(e, frame)) ?? '' }),
    image: (e) => ({ ...e, frame: 'image', copy: '' }),
  });
}

type Pictured = { imageUrl: string; guidePicture: boolean; community?: boolean };
/** Eventbrite's pictures, linked from its servers, do not always show elsewhere: a page's picture is one of them only when nothing else has a picture. */
const hotlinked = (url: string) => /^https:\/\/img\.evbuc\.com\//.test(url);

/**
 * Entries onto pages of a two-across grid, in order: a box a page for a
 * picture and the rest listings. The picture is the one staff chose, else
 * the first with its own picture that is not linked from Eventbrite or a
 * community event, else any;
 * it follows its listing in the same row, and a listing in the
 * right-hand column swaps with the one before it to make room. A page
 * with no picture to show takes one more listing instead.
 */
export function gridPages<T extends Pictured>(items: T[], cells: number, cell: { listing: (t: T) => T; image: (t: T) => T }): T[][] {
  const pages: T[][] = [];
  let i = 0;
  while (i < items.length) {
    const page = items.slice(i, i + cells - 1);
    const pick = page
      .map((e, at) => ({ e, at }))
      .filter(({ e }) => e.imageUrl)
      .sort((a, b) => Number(b.e.guidePicture) - Number(a.e.guidePicture) || Number(hotlinked(a.e.imageUrl)) - Number(hotlinked(b.e.imageUrl)) || Number(!!a.e.community) - Number(!!b.e.community) || a.at - b.at)[0];
    if (!pick) {
      // Nothing on this page to picture: a listing fills the box instead.
      const full = items.slice(i, i + cells);
      pages.push(full.map(cell.listing));
      i += full.length;
      continue;
    }
    const listed = page.map(cell.listing);
    const at = pick.at - (pick.at % 2);
    const [chosen] = listed.splice(pick.at, 1);
    listed.splice(at, 0, chosen!, cell.image(page[pick.at]!));
    pages.push(listed);
    i += page.length;
  }
  return pages;
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
  size: ListingSize;
  /** First listed in the last six months: printed NEW beside its name. */
  isNew: boolean;
  copy: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  imageUrl: string;
  /** A web-sized copy of the picture for the on-screen proof. Not printed. */
  preview: string;
  /** Every whole-sentence version of the copy, fullest first, for a box to fit. Not printed. */
  options: string[];
};

const SECTION_OF_CATEGORY: Record<Place['category'], string> = {
  stay: 'Stay', 'eat-drink': 'Eat', see: 'See', do: 'Do', shop: 'Buy',
};

export function guideVenue(p: Place): GuideVenue {
  const options = copyOptions({ guideCopy: p.guideCopy, summary: p.summary, description: p.description });
  return {
    section: p.guideSection ?? SECTION_OF_CATEGORY[p.category],
    area: p.guideArea ?? '',
    name: p.name,
    label: (p.guideLabel ?? '').toUpperCase(),
    size: p.listingSize,
    isNew: isNewVenue(p.firstListedAt),
    // A directory line has no copy; the bigger entries do.
    copy: p.listingSize === 'directory' ? '' : p.guideCopy ?? p.summary ?? '',
    address: [p.addressLine1, printAddress({ addressLine1: null, parish: p.parish, postcode: null })].filter(Boolean).join(', '),
    phone: p.phone ?? '',
    email: p.email ?? '',
    website: printWebsite(p.website) ?? '',
    imageUrl: printable(p.headerImage) ? p.headerImage!.url : '',
    preview: printable(p.headerImage) ? webImage(p.headerImage!, 900, 600) : '',
    options: p.listingSize === 'directory' ? [] : options,
  };
}

/**
 * The venue sections in the order the 2026 editions print them (Visit,
 * See, Do, Buy, Eat), then any other section a venue is set to; areas
 * in the order the guide reads the island, then any other, then those
 * with no area.
 */
export const VENUE_SECTION_ORDER = ['Visit', 'See', 'Do', 'Buy', 'Eat'] as const;
export const VENUE_AREA_ORDER = ['St. Helier', 'St. Aubin', 'West', 'North', 'East', 'Gorey', 'South'] as const;
const SIZE_ORDER: Record<ListingSize, number> = { full: 0, 'three-quarters': 1, half: 2, quarter: 3, listing: 4, directory: 5 };
const ranked = (order: readonly string[], v: string) => {
  const i = order.indexOf(v);
  return i < 0 ? order.length + (v ? 0 : 1) : i;
};

/** A box on a venue grid page: an entry across both columns for so many rows, or a listing in one box. */
export type VenueFrame = 'three-quarters' | 'half' | 'quarter' | 'listing';
export type VenueCell = GuideVenue & { frame: VenueFrame };
export type VenuePage = { kind: 'full'; venue: GuideVenue } | { kind: 'grid'; cells: VenueCell[] };
export type VenueArea = { area: string; pages: VenuePage[]; directory: GuideVenue[] };
export type VenueSection = { section: string; areas: VenueArea[] };

/** The grid of eight is four rows of two boxes. An entry across both columns takes whole rows; a listing half of one. */
const ROWS = GRID.grid8.cells / 2;
const ROWS_OF: Record<Exclude<VenueFrame, 'listing'>, number> = { 'three-quarters': 3, half: 2, quarter: 1 };

/**
 * Venues onto pages, section by section and area by area, on the grid the
 * events and tours use. A full-page entry is a page of its own. The bigger
 * grid entries go first, each onto the first page with rows enough for it
 * (three-quarters and a quarter share a page; so do two halves). Listings
 * then fill the rows left, two to a row, and further grids of eight.
 * Directory lines follow the area's pages as a ruled list. Within a size,
 * by name.
 */
export function venueSections(venues: GuideVenue[]): VenueSection[] {
  const sections = [...new Set(venues.map((v) => v.section))].sort((a, b) => ranked(VENUE_SECTION_ORDER, a) - ranked(VENUE_SECTION_ORDER, b) || a.localeCompare(b));
  return sections.map((section) => {
    const inSection = venues.filter((v) => v.section === section);
    const areas = [...new Set(inSection.map((v) => v.area))].sort((a, b) => ranked(VENUE_AREA_ORDER, a) - ranked(VENUE_AREA_ORDER, b) || a.localeCompare(b));
    return {
      section,
      areas: areas.map((area) => {
        const here = inSection.filter((v) => v.area === area).sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size] || a.name.localeCompare(b.name));
        const fulls: VenuePage[] = here.filter((v) => v.size === 'full').map((venue) => ({ kind: 'full', venue }));
        const grids: { cells: VenueCell[]; free: number }[] = [];
        for (const v of here) {
          if (v.size !== 'three-quarters' && v.size !== 'half' && v.size !== 'quarter') continue;
          const rows = ROWS_OF[v.size];
          let page = grids.find((g) => g.free >= rows);
          if (!page) grids.push((page = { cells: [], free: ROWS }));
          page.cells.push({ ...v, frame: v.size });
          page.free -= rows;
        }
        const listings: VenueCell[] = here.filter((v) => v.size === 'listing').map((v) => ({ ...v, frame: 'listing' }));
        for (const g of grids) {
          g.cells.push(...listings.splice(0, g.free * 2));
          g.free = 0;
        }
        while (listings.length) grids.push({ cells: listings.splice(0, GRID.grid8.cells), free: 0 });
        return { area, pages: [...fulls, ...grids.map((g): VenuePage => ({ kind: 'grid', cells: g.cells }))], directory: here.filter((v) => v.size === 'directory') };
      }),
    };
  });
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
  imageUrl: string;
  /** A web-sized copy of the picture for the on-screen proof. Not printed. */
  preview: string;
  /** Staff chose its picture for the grid's picture box. Not printed. */
  guidePicture: boolean;
  /** Every whole-sentence version of the copy, fullest first, for a grid box to fit. Not printed. */
  options: string[];
  /** In the grid: a listing, or the picture box beside it. */
  frame: 'listing' | 'image';
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
    title: printTitle(x.title),
    code: provider?.code ?? '',
    provider: provider?.name ?? '',
    duration: x.duration ?? '',
    // Bookable all day at many times reads as noise in print; leave it to the provider.
    times: times.split(/ \| |, /).length > 2 ? '' : times,
    copy: x.guideCopy ?? x.summary ?? '',
    sortKey: inside[0]?.date ?? '',
    imageUrl: printable(x.headerImage) ? x.headerImage!.url : '',
    preview: printable(x.headerImage) ? webImage(x.headerImage!, 520, 182) : '',
    guidePicture: x.guidePicture,
    options: copyOptions(x),
    frame: 'listing',
  };
}

/** A tour's box on the grid: when (or, on the on-demand pages, its genre), its title, the copy, then the provider's code and the duration. The code points to the key. */
const TOUR_BOX = { height: GRID.grid8.height, picture: false };
export const tourWhen = (t: Pick<GuideTour, 'kind' | 'dates' | 'genre'>) => (t.kind === 'dated' ? t.dates : t.genre || 'On demand');

/** Walks and tours on the grid of eight, in the order they print: seven listings and a picture a page. */
export function gridTours(tours: GuideTour[]): GuideTour[][] {
  return gridPages(tours, GRID.grid8.cells, {
    listing: (t) => {
      const room = copyBudget({ dates: tourWhen(t), times: t.times, title: t.title, price: '', venue: t.code ? '' : t.provider, address: '', contact: '', website: [t.code, t.duration].filter(Boolean).join('  ') }, TOUR_BOX);
      return { ...t, frame: 'listing', copy: t.options.find((c) => c.length <= room) ?? '' };
    },
    image: (t) => ({ ...t, frame: 'image', copy: '' }),
  });
}
