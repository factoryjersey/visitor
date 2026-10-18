import { UNIQUE, type Occurrence } from '@/lib/domain/occurrence';
import { CATEGORIES, INCLUSIONS, type Category, type Inclusion } from '@/lib/db/schema';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s.trim() === '' ? undefined : s.trim();
}

export const asInclusion = (v: string | undefined): Inclusion | undefined =>
  (INCLUSIONS as readonly string[]).includes(v ?? '') ? (v as Inclusion) : undefined;

export const asCategory = (v: string | undefined): Category | undefined =>
  (CATEGORIES as readonly string[]).includes(v ?? '') ? (v as Category) : undefined;

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
