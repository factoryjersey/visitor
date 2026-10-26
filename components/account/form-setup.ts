import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { CATEGORIES, places, type ListingKind } from '@/lib/db/schema';
import { PROVIDER_FIELDS, datesText } from '@/lib/domain/listing-form';
import { CATEGORY_LABEL } from '@/lib/params';
import type { FormDefaults } from './listing-form';

const pounds = (p: unknown) => (typeof p === 'number' ? (p / 100).toFixed(2).replace(/\.00$/, '') : '');

/** A listing's provider fields as form text: prices in pounds, dates one a line. */
export function formDefaults(kind: ListingKind, row: Record<string, unknown>): FormDefaults {
  const out: FormDefaults = {};
  for (const f of PROVIDER_FIELDS[kind]) {
    const v = row[f];
    if (f === 'dates') out[f] = datesText((v as never) ?? []);
    else if (f.endsWith('PricePence')) out[f] = pounds(v);
    else if (f === 'free') out[f] = v === true;
    else out[f] = v == null ? '' : String(v);
  }
  return out;
}

/** Choices for the select fields: venue types, and for an event, the business's own venues. */
export async function formOptions(kind: ListingKind, businessId: string) {
  const options: Record<string, { value: string; label: string }[]> = {};
  if (kind === 'venue') options.category = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));
  if (kind === 'event') {
    const own = await db.select({ id: places.id, name: places.name }).from(places).where(eq(places.businessId, businessId)).orderBy(asc(places.name));
    options.placeId = own.map((p) => ({ value: p.id, label: p.name }));
  }
  return options;
}
