import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  businesses,
  events,
  experiences,
  listingChanges,
  places,
  providers,
  type Business,
  type FieldSources,
  type ListingKind,
} from '@/lib/db/schema';
import { canEditListing, type Actor } from '@/lib/auth/roles';
import { PROVIDER_FIELDS, changedFields, derivedFromDates, type ListingValues } from '@/lib/domain/listing-form';
import { slugify, uniqueSlug } from '@/lib/domain/slug';

/**
 * Providers' listings, and staff review of them.
 *
 * A new listing waits as `review: 'pending'`, hidden from the site and the
 * guide, and its provider can keep editing it. Once approved it is public,
 * so a provider's edit no longer writes the row: it waits in
 * listing_changes until staff approve it. Either way, the fields a provider
 * wrote are locked, so the next import keeps their answer.
 */

export const TABLES = { venue: places, event: events, experience: experiences } as const;
type Table = (typeof TABLES)[ListingKind];

export const KIND_LABEL: Record<ListingKind, string> = { venue: 'Venue', event: 'Event', experience: 'Tour' };
export const titleOf = (row: { name?: string; title?: string }) => row.name ?? row.title ?? '';

/** Provenance for what a provider wrote, the way an import stamps its own fields. */
function stamp(fields: string[], businessId: string, current: FieldSources = {}): FieldSources {
  const at = new Date().toISOString();
  const out = { ...current };
  for (const f of fields) out[f] = { source: 'provider', ref: businessId, at };
  return out;
}

async function freeSlug(table: Table, base: string) {
  const root = slugify(base);
  const rows = await db.select({ slug: table.slug }).from(table).where(like(table.slug, `${root}%`));
  const taken = new Set(rows.map((r) => r.slug));
  return uniqueSlug(base, (s) => taken.has(s));
}

/** The tour provider a business prints as in the guide's key, made the first time it lists a tour. */
async function providerFor(business: Business): Promise<string> {
  if (business.providerId) return business.providerId;
  const [existing] = await db.select().from(providers).where(eq(providers.name, business.name));
  const id =
    existing?.id ??
    (await db
      .insert(providers)
      .values({ name: business.name, email: business.email, phone: business.phone, website: business.website })
      .returning())[0]!.id;
  await db.update(businesses).set({ providerId: id, updatedAt: new Date() }).where(eq(businesses.id, business.id));
  return id;
}

/** An event's venue must be one of the business's own, or none. */
async function checkVenue(placeId: string | null, businessId: string) {
  if (!placeId) return true;
  const [p] = await db.select({ businessId: places.businessId }).from(places).where(eq(places.id, placeId));
  return p?.businessId === businessId;
}

/** Everything the values imply on the row: dates' range and occurrence. */
function withDerived(kind: ListingKind, values: Record<string, unknown>, locked: readonly string[]) {
  if (kind === 'venue' || !('dates' in values)) return values;
  return { ...values, ...derivedFromDates(kind, values.dates as never, locked) };
}

export type SaveResult = { ok: true; slug: string; outcome: 'created' | 'saved' | 'submitted' | 'unchanged' } | { ok: false; error: string };

export async function createListing<K extends ListingKind>(
  kind: K,
  values: ListingValues[K],
  user: { email: string; businessId: string },
): Promise<SaveResult> {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, user.businessId));
  if (!business) return { ok: false, error: 'No business' };
  const v = values as Record<string, unknown>;
  if (kind === 'event' && !(await checkVenue((v.placeId as string | null) ?? null, business.id))) return { ok: false, error: 'Not your venue' };

  const fields = PROVIDER_FIELDS[kind];
  const table = TABLES[kind];
  const slug = await freeSlug(table, String(v.name ?? v.title));
  const now = new Date();
  const row = {
    ...withDerived(kind, v, []),
    slug,
    businessId: business.id,
    review: 'pending' as const,
    lockedFields: fields,
    fieldSources: stamp(fields, business.id),
    editedBy: user.email,
    editedAt: now,
    ...(kind === 'experience' ? { providerId: await providerFor(business) } : {}),
  };
  await db.insert(table).values(row as never);
  return { ok: true, slug, outcome: 'created' };
}

/**
 * Save a provider's edit. Before approval it writes the row; after, it
 * becomes the listing's one open change, replacing any earlier one. An
 * edit that puts everything back as it is withdraws the open change.
 */
export async function updateListing<K extends ListingKind>(
  kind: K,
  id: string,
  values: ListingValues[K],
  user: { email: string; businessId: string } & Actor,
): Promise<SaveResult> {
  const table = TABLES[kind];
  const [row] = (await db.select().from(table).where(eq(table.id, id))) as Record<string, unknown>[];
  if (!row || !canEditListing(user, { businessId: row.businessId as string | null })) return { ok: false, error: 'Not found' };
  const v = values as Record<string, unknown>;
  if (kind === 'event' && !(await checkVenue((v.placeId as string | null) ?? null, user.businessId))) return { ok: false, error: 'Not your venue' };
  const slug = row.slug as string;
  const locked = row.lockedFields as string[];

  if (row.review !== 'approved') {
    const fields = PROVIDER_FIELDS[kind];
    const now = new Date();
    await db
      .update(table)
      .set({
        ...withDerived(kind, v, locked),
        review: 'pending',
        reviewNote: null,
        lockedFields: [...new Set([...locked, ...fields])],
        fieldSources: stamp(fields, user.businessId, row.fieldSources as FieldSources),
        editedBy: user.email,
        editedAt: now,
        updatedAt: now,
      } as never)
      .where(eq(table.id, id));
    return { ok: true, slug, outcome: 'saved' };
  }

  const changes = changedFields(row, v);
  await db.transaction(async (tx) => {
    await tx.delete(listingChanges).where(and(eq(listingChanges.kind, kind), eq(listingChanges.listingId, id), eq(listingChanges.status, 'pending')));
    if (Object.keys(changes).length) {
      await tx.insert(listingChanges).values({ kind, listingId: id, businessId: user.businessId, changes, submittedBy: user.email });
    }
  });
  return { ok: true, slug, outcome: Object.keys(changes).length ? 'submitted' : 'unchanged' };
}

export async function openChange(kind: ListingKind, listingId: string) {
  const [c] = await db
    .select()
    .from(listingChanges)
    .where(and(eq(listingChanges.kind, kind), eq(listingChanges.listingId, listingId), eq(listingChanges.status, 'pending')));
  return c ?? null;
}

/** The latest turned-down change, so a provider can see why. */
export async function lastRejectedChange(kind: ListingKind, listingId: string) {
  const [c] = await db
    .select()
    .from(listingChanges)
    .where(and(eq(listingChanges.kind, kind), eq(listingChanges.listingId, listingId)))
    .orderBy(desc(listingChanges.updatedAt))
    .limit(1);
  return c?.status === 'rejected' ? c : null;
}

/** Write an approved change to its listing, and lock what it touched. */
export async function approveChange(changeId: string, reviewer: string) {
  const [change] = await db.select().from(listingChanges).where(and(eq(listingChanges.id, changeId), eq(listingChanges.status, 'pending')));
  if (!change) return;
  const table = TABLES[change.kind];
  const [row] = (await db.select().from(table).where(eq(table.id, change.listingId))) as Record<string, unknown>[];
  const now = new Date();
  await db.transaction(async (tx) => {
    if (row) {
      const fields = Object.keys(change.changes);
      const locked = row.lockedFields as string[];
      await tx
        .update(table)
        .set({
          ...withDerived(change.kind, change.changes, locked),
          lockedFields: [...new Set([...locked, ...fields])],
          fieldSources: stamp(fields, change.businessId, row.fieldSources as FieldSources),
          editedBy: change.submittedBy,
          editedAt: now,
          updatedAt: now,
        } as never)
        .where(eq(table.id, change.listingId));
    }
    await tx.update(listingChanges).set({ status: 'approved', reviewedBy: reviewer, reviewedAt: now, updatedAt: now }).where(eq(listingChanges.id, change.id));
  });
}

export async function rejectChange(changeId: string, reviewer: string, note: string | null) {
  const now = new Date();
  await db
    .update(listingChanges)
    .set({ status: 'rejected', reviewedBy: reviewer, reviewedAt: now, reviewNote: note, updatedAt: now })
    .where(and(eq(listingChanges.id, changeId), eq(listingChanges.status, 'pending')));
}

/** Decide on a new listing. Approved, it is public and a candidate for the guide like any other. */
export async function reviewListing(kind: ListingKind, id: string, decision: 'approved' | 'rejected', note: string | null) {
  const table = TABLES[kind];
  const now = new Date();
  await db
    .update(table)
    .set({ review: decision, reviewNote: decision === 'rejected' ? note : null, updatedAt: now } as never)
    .where(eq(table.id, id));
}

/** A business's listings, each with whether an edit is waiting. */
export async function businessListings(businessId: string) {
  const [venues, evs, tours, open] = await Promise.all([
    db.select().from(places).where(eq(places.businessId, businessId)).orderBy(places.name),
    db.select().from(events).where(eq(events.businessId, businessId)).orderBy(desc(events.startsOn)),
    db.select().from(experiences).where(eq(experiences.businessId, businessId)).orderBy(experiences.title),
    db.select().from(listingChanges).where(and(eq(listingChanges.businessId, businessId), eq(listingChanges.status, 'pending'))),
  ]);
  const waiting = new Set(open.map((c) => `${c.kind}:${c.listingId}`));
  const tag = <T extends { id: string }>(kind: ListingKind, rows: T[]) => rows.map((r) => ({ row: r, changeWaiting: waiting.has(`${kind}:${r.id}`) }));
  return { venues: tag('venue', venues), events: tag('event', evs), experiences: tag('experience', tours) };
}

/** What staff have to look at: new listings, and edits to public ones. */
export async function reviewQueue() {
  const pendingOf = async (kind: ListingKind) => {
    const table = TABLES[kind];
    const rows = (await db
      .select({ row: table, business: { id: businesses.id, name: businesses.name } })
      .from(table)
      .leftJoin(businesses, eq(businesses.id, table.businessId))
      .where(eq(table.review, 'pending'))
      .orderBy(table.updatedAt)) as { row: Record<string, unknown> & { id: string; slug: string }; business: { id: string; name: string } | null }[];
    return rows.map((r) => ({ kind, ...r }));
  };
  const [v, e, x, changes] = await Promise.all([
    pendingOf('venue'),
    pendingOf('event'),
    pendingOf('experience'),
    db
      .select({ change: listingChanges, business: { id: businesses.id, name: businesses.name } })
      .from(listingChanges)
      .innerJoin(businesses, eq(businesses.id, listingChanges.businessId))
      .where(eq(listingChanges.status, 'pending'))
      .orderBy(listingChanges.updatedAt),
  ]);

  const byKind = (kind: ListingKind) => changes.filter((c) => c.change.kind === kind).map((c) => c.change.listingId);
  const current = new Map<string, Record<string, unknown>>();
  for (const kind of ['venue', 'event', 'experience'] as const) {
    const ids = byKind(kind);
    if (!ids.length) continue;
    const table = TABLES[kind];
    for (const r of (await db.select().from(table).where(inArray(table.id, ids))) as Record<string, unknown>[]) current.set(`${kind}:${r.id}`, r);
  }
  return {
    listings: [...v, ...e, ...x],
    changes: changes.map((c) => ({ ...c, listing: current.get(`${c.change.kind}:${c.change.listingId}`) ?? null })),
  };
}

export async function reviewCount() {
  const [row] = await db.execute<{ n: number }>(sql`select
    (select count(*) from ${places} where ${places.review} = 'pending') +
    (select count(*) from ${events} where ${events.review} = 'pending') +
    (select count(*) from ${experiences} where ${experiences.review} = 'pending') +
    (select count(*) from ${listingChanges} where ${listingChanges.status} = 'pending') as n`);
  return Number(row?.n ?? 0);
}
