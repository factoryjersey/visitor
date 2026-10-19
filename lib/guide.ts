import { guideSelection, includedExperiences } from '@/lib/db/queries';
import type { Provider } from '@/lib/db/schema';
import { GENRES } from '@/lib/domain/genre';
import {
  defaultWindow,
  guideEvent,
  guideTour,
  guideVenue,
  type GuideEvent,
  type GuideTour,
  type GuideVenue,
  type Window,
} from '@/lib/domain/guide-entry';
import { printContact, printWebsite } from '@/lib/domain/house-style';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The guide's four editions a year. Winter runs into the next year, so
 * Winter 2026 is November 2026 to February 2027.
 */
export function editions(year: number): { name: string; window: Window }[] {
  return [
    { name: `Spring ${year}`, window: { from: `${year}-03-01`, to: `${year}-05-31` } },
    { name: `Summer ${year}`, window: { from: `${year}-06-01`, to: `${year}-08-31` } },
    { name: `Autumn ${year}`, window: { from: `${year}-09-01`, to: `${year}-10-31` } },
    { name: `Winter ${year}`, window: { from: `${year}-11-01`, to: `${year + 1}-02-${(year + 1) % 4 === 0 ? 29 : 28}` } },
  ];
}

/** ?draft=1: lay out everything eligible, not only what has been included. */
export const isDraft = (v: string | null | undefined) => v === '1';

/** The edition's dates from ?from=&to=, or the coming three months. */
export function windowFrom(params: { from?: string; to?: string }): Window {
  const fallback = defaultWindow();
  const from = params.from && ISO.test(params.from) ? params.from : fallback.from;
  const to = params.to && ISO.test(params.to) && params.to >= from ? params.to : fallback.to;
  return { from, to };
}

export type GuideProvider = { code: string; name: string; contact: string; website: string };

export type Guide = {
  /** Highlights, each a full page, ahead of the listings and not repeated in them. */
  highlights: GuideEvent[];
  events: GuideEvent[];
  tours: GuideTour[];
  providers: GuideProvider[];
  venues: GuideVenue[];
};

const genreOrder = (g: string) => {
  const i = (GENRES as readonly string[]).indexOf(g);
  return i < 0 ? GENRES.length : i;
};

/**
 * Everything included, as printed entries, in guide order: events by
 * their first date in the edition; dated tours by date, then
 * on-demand ones by genre; the provider key only for providers with a
 * tour in this edition.
 */
export async function buildGuide(window: Window, opts: { draft?: boolean } = {}): Promise<Guide> {
  const [selection, tourRows] = await Promise.all([guideSelection(opts), includedExperiences(opts)]);

  const all = selection.events
    .map(({ event, venue }) => guideEvent(event, venue, window))
    .filter((g): g is GuideEvent => g !== null);
  const highlights = all.filter((e) => e.highlight).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  // By their first date in the edition, long runs among the rest, as the 2026 pages print them.
  const events = all.filter((e) => !e.highlight).sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.title.localeCompare(b.title));

  const printed: { tour: GuideTour; provider: Provider | null }[] = [];
  for (const { experience, provider } of tourRows) {
    const tour = guideTour(experience, provider, window);
    if (tour) printed.push({ tour, provider });
  }
  const tours = printed
    .map((p) => p.tour)
    .sort((a, b) =>
      (a.kind === b.kind ? 0 : a.kind === 'dated' ? -1 : 1)
      || (a.kind === 'dated'
        ? a.sortKey.localeCompare(b.sortKey)
        : genreOrder(a.genre) - genreOrder(b.genre))
      || a.title.localeCompare(b.title));

  const byId = new Map<string, Provider>();
  for (const { provider } of printed) if (provider) byId.set(provider.id, provider);
  const providers = [...byId.values()]
    .map((p) => ({ code: p.code ?? '', name: p.name, contact: printContact(p.phone, p.email) ?? '', website: printWebsite(p.website)?.toLowerCase() ?? '' }))
    .sort((a, b) => (a.code || 'ZZZ').localeCompare(b.code || 'ZZZ') || a.name.localeCompare(b.name));

  const venues = selection.venues
    .map(guideVenue)
    .sort((a, b) => a.section.localeCompare(b.section) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name));

  return { highlights, events, tours, providers, venues };
}

export const EVENT_COLUMNS = ['Dates', 'Times', 'Title', 'Copy', 'Price', 'Venue', 'Address', 'Contact', 'Website', 'Image URL', 'Block'] as const;
/** Highlights merge into their own full-page template. */
export const HIGHLIGHT_COLUMNS = ['Dates', 'Times', 'Title', 'Extended Copy', 'Price', 'Venue', 'Address', 'Contact', 'Website', 'Image URL'] as const;
export const TOUR_COLUMNS = ['Kind', 'Genre', 'Dates', 'Title', 'Code', 'Duration', 'Times', 'Copy', 'Provider'] as const;
export const PROVIDER_COLUMNS = ['Code', 'Name', 'Contact', 'Website'] as const;
export const VENUE_COLUMNS = ['Section', 'Area', 'Name', 'Label', 'Size', 'Copy', 'Address', 'Phone', 'Website', 'Image URL'] as const;
