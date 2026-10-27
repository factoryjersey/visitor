import type { ListingSize } from '@/lib/db/schema';

/**
 * A guide section laid out as a magazine spread, as the printed guide
 * gives its space: the venues with the most space in print lead as
 * stories, the next run down a sidebar, and the rest follow as a
 * directory.
 *
 * What earns a story is what the printed guide gave it: a full page,
 * then three-quarters, a half, a quarter, then a place among those the visitor guide featured, then copy
 * of our own. A story needs a picture; a promoted venue without one
 * heads the sidebar instead. The private client tag plays no part.
 */
export type Editorial = { listingSize: ListingSize; recommendedIn: string | null; guideCopy: string | null; headerImage: unknown; name: string };

const SIZE: Record<ListingSize, number> = { full: 4, 'three-quarters': 3.5, half: 3, quarter: 2.5, listing: 0, directory: 0 };

export const promotion = (v: Editorial) => SIZE[v.listingSize] + (v.recommendedIn ? 2 : 0) + (v.guideCopy ? 1 : 0);

export type Spread<T> = { lead: T | null; stories: T[]; sidebar: T[]; rest: T[] };

export function spread<T extends Editorial>(venues: T[], opts: { stories: number; sidebar: number }): Spread<T> {
  const ranked = [...venues].sort((a, b) => promotion(b) - promotion(a) || a.name.localeCompare(b.name));
  const storied = ranked.filter((v) => promotion(v) > 0 && v.headerImage).slice(0, opts.stories + 1);
  const [lead = null, ...stories] = storied;
  const told = new Set<T>(storied);
  const sidebar = ranked.filter((v) => !told.has(v)).slice(0, opts.sidebar);
  for (const v of sidebar) told.add(v);
  const rest = venues.filter((v) => !told.has(v)).sort((a, b) => a.name.localeCompare(b.name));
  return { lead, stories, sidebar, rest };
}
