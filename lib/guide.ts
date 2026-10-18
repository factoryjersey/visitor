import { guideSelection } from '@/lib/db/queries';
import { defaultWindow, guideEvent, guideVenue, type GuideEvent, type GuideVenue, type Window } from '@/lib/domain/guide-entry';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The edition's dates from ?from=&to=, or the coming three months. */
export function windowFrom(params: { from?: string; to?: string }): Window {
  const fallback = defaultWindow();
  const from = params.from && ISO.test(params.from) ? params.from : fallback.from;
  const to = params.to && ISO.test(params.to) && params.to >= from ? params.to : fallback.to;
  return { from, to };
}

/** Everything included, as printed entries, in guide order. */
export async function buildGuide(window: Window): Promise<{ events: GuideEvent[]; venues: GuideVenue[] }> {
  const selection = await guideSelection();
  const events = selection.events
    .map(({ event, venue }) => guideEvent(event, venue, window))
    .filter((g): g is GuideEvent => g !== null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.title.localeCompare(b.title));
  const venues = selection.venues
    .map(guideVenue)
    .sort((a, b) => a.section.localeCompare(b.section) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
  return { events, venues };
}

export const EVENT_COLUMNS = ['Dates', 'Times', 'Title', 'Copy', 'Price', 'Venue', 'Address', 'Contact', 'Website', 'Image URL'] as const;
export const VENUE_COLUMNS = ['Section', 'Area', 'Name', 'Label', 'Size', 'Copy', 'Address', 'Phone', 'Website', 'Image URL'] as const;
