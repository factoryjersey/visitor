import { slugify } from './slug';

/**
 * What's on's landing pages: one for each kind of event a visitor looks
 * for (/whats-on/music) and one for the weekend (/whats-on/this-weekend).
 * A fixed, small set of addresses, built ahead, in place of a filter for
 * every combination of kind, date and venue.
 */

/** The kinds with a page of their own: the tiles on What's on, in their order. */
export const LANDING_TYPES = [
  'Festivals', 'Music', 'Sports', 'Family friendly', 'Charity', 'Food & drink', 'Arts & cultural',
  'History & Heritage', 'Outdoor', 'Nightlife', 'Markets & fairs', 'Talks & learning', 'Health & wellbeing', 'Seasonal',
] as const;

/** "Food & drink" to "food-and-drink". Event addresses always end in a year, so these never meet one. */
export const typeSlug = (type: string) => slugify(type);
export const typePath = (type: string) => `/whats-on/${typeSlug(type)}`;
export const typeFromSlug = (slug: string): string | null => LANDING_TYPES.find((t) => typeSlug(t) === slug) ?? null;

export const WEEKEND_PATH = '/whats-on/this-weekend';

/**
 * The weekend a visitor means: Friday to Sunday, this week's from Monday
 * to Thursday, and from today once it has begun.
 */
export function weekendRange(today: string): { from: string; to: string } {
  const d = new Date(`${today}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 Sunday … 6 Saturday
  const toFriday = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow;
  const day = (offset: number) => new Date(d.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  const friday = day(toFriday);
  return { from: friday > today ? friday : today, to: day(toFriday + 2) };
}
