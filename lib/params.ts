import { UNIQUE, type Occurrence } from '@/lib/domain/occurrence';
import { CATEGORIES, INCLUSIONS, type Category, type Inclusion } from '@/lib/db/schema';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s.trim() === '' ? undefined : s.trim();
}

/** Several values in one parameter, comma-separated or repeated: the kinds of event chosen together. */
export function many(v: string | string[] | undefined): string[] {
  const all = (Array.isArray(v) ? v : v === undefined ? [] : [v]).flatMap((s) => s.split(','));
  return [...new Set(all.map((s) => s.trim()).filter(Boolean))];
}

export const asInclusion = (v: string | undefined): Inclusion | undefined =>
  (INCLUSIONS as readonly string[]).includes(v ?? '') ? (v as Inclusion) : undefined;

export const asCategory = (v: string | undefined): Category | undefined =>
  (CATEGORIES as readonly string[]).includes(v ?? '') ? (v as Category) : undefined;

/** Places to stay by kind, in the order the Stay section shows them; the plural heads each part. Visit Jersey's types. */
export const STAY_TYPES = [
  { type: 'Hotel', plural: 'Hotels', slug: 'hotels' },
  { type: 'Guest house', plural: 'Guest houses', slug: 'guest-houses' },
  { type: 'Self-catering', plural: 'Self-catering', slug: 'self-catering' },
  { type: 'Camping & glamping', plural: 'Camping & glamping', slug: 'camping' },
  { type: 'Hostel', plural: 'Hostels', slug: 'hostels' },
] as const;

export const CATEGORY_LABEL: Record<Category, string> = {
  stay: 'Stay',
  'eat-drink': 'Eat & drink',
  see: 'See',
  do: 'Do',
  shop: 'Shop',
};


/** Unique events always; regular and ongoing when their tick is on. */
export function occurrencesFrom(sp: { regular?: string; ongoing?: string }): Occurrence[] {
  return [...UNIQUE, ...(sp.regular === '1' ? (['regular'] as const) : []), ...(sp.ongoing === '1' ? (['ongoing'] as const) : [])];
}
