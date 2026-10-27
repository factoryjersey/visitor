import type { DoSide } from '@/lib/db/schema';
import { GRID, gridPages, type VenueGrid } from './guide-entry';

/**
 * The guide's Do section, as the 2026 editions set it: a box for each
 * activity (its name, its short piece, and the markers of the providers
 * who offer it), on the water first and then on land, running on so no
 * page is left part empty, on the section's grid with a picture a page;
 * then the providers' index, each provider's
 * marker, name and contact with a tick under each activity it offers.
 */
export type DoBox = {
  slug: string;
  name: string;
  side: DoSide;
  blurb: string;
  /** The markers of the providers in this edition who offer it, A to Z. */
  codes: string[];
  imageUrl: string;
  /** A web-sized copy for the on-screen proof. Not printed. */
  preview: string;
  guidePicture: boolean;
  /** In the grid: the activity, or the picture box beside it. */
  frame: 'listing' | 'image';
};

export type DoProvider = { code: string; name: string; phone: string; website: string; activities: string[] };

/** A page of activities, and which sides they are from: both where the water gives way to land. */
export type DoPage = { sides: DoSide[]; cells: DoBox[] };
export type DoSection = { grid: VenueGrid; pages: DoPage[]; activities: { slug: string; name: string; side: DoSide }[]; providers: DoProvider[] };

/** The providers' index rows a page holds. */
export const DO_INDEX_ROWS = 18;

export const SIDE_TITLE: Record<DoSide, string> = { water: 'On the water', land: 'On land' };

/** The activities onto pages of the grid, water then land, a picture a page; providers A to Z by marker. */
export function doSection(boxes: Omit<DoBox, 'codes' | 'frame'>[], providers: DoProvider[], grid: VenueGrid): DoSection {
  const offered = (slug: string) => providers.filter((p) => p.activities.includes(slug)).map((p) => p.code).sort();
  const run: DoBox[] = (['water', 'land'] as const).flatMap((side) => boxes.filter((b) => b.side === side).map((b) => ({ ...b, codes: offered(b.slug), frame: 'listing' as const })));
  const pages: DoPage[] = gridPages(run, GRID[grid].cells, { listing: (b) => b, image: (b) => ({ ...b, frame: 'image' as const }) })
    .map((cells) => ({ sides: (['water', 'land'] as const).filter((side) => cells.some((c) => c.side === side)), cells }));
  const activities = boxes.map((b) => ({ slug: b.slug, name: b.name, side: b.side }));
  const slugs = new Set(activities.map((a) => a.slug));
  return {
    grid,
    pages,
    activities,
    providers: providers
      .map((p) => ({ ...p, activities: p.activities.filter((a) => slugs.has(a)) }))
      .filter((p) => p.activities.length)
      .sort((a, b) => a.code.localeCompare(b.code)),
  };
}

/**
 * How the activities fill the grid: with a picture a page each page
 * holds one fewer than the grid's boxes. Says how many pages that makes,
 * how many boxes stay empty, and how many to add, or take out, for full
 * pages.
 */
export function doFill(count: number, grid: VenueGrid): { pages: number; empty: number; add: number; drop: number } {
  const perPage = GRID[grid].cells - 1;
  if (count === 0) return { pages: 0, empty: 0, add: 0, drop: 0 };
  const pages = Math.ceil(count / perPage);
  const empty = pages * perPage - count;
  return { pages, empty, add: empty, drop: empty ? count - (pages - 1) * perPage : 0 };
}
