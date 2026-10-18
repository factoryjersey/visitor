/**
 * Visit Jersey → source_records → places / events.
 *
 *   pnpm import:visit-jersey                     every type, live
 *   pnpm import:visit-jersey --types events      one or more types
 *   pnpm import:visit-jersey --fixture <file>    from a saved JSON file
 *
 * Safe to run again: records are keyed on (source, type, id), places
 * keep their slug, inclusion and our copy, and locked fields are never
 * written. A record the source stops returning is marked not present,
 * never deleted, so last edition's entry is still there to look at.
 */
import '@/lib/load-env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { and, eq, notInArray } from 'drizzle-orm';
import { client, db } from '@/lib/db';
import { events, places, sourceRecords, type Event, type Place } from '@/lib/db/schema';
import { mergeFromSource } from '@/lib/domain/merge';
import { isSamePlace } from '@/lib/domain/same-place';
import { matchVenue } from '@/lib/domain/venue-match';
import { uniqueSlug } from '@/lib/domain/slug';
import { PLACE_TYPES, fetchRawListings, type ListingType, type PlaceType, type RawItem } from '@/lib/integrations/jersey-com/directory';
import { isListingType, toEvent, toPlace, type VjEvent, type VjPlace } from '@/lib/integrations/jersey-com/parse';

const SOURCE = 'visit_jersey';

const { values } = parseArgs({
  options: { fixture: { type: 'string' }, types: { type: 'string' } },
});

const types: ListingType[] = values.types
  ? values.types.split(',').map((t) => t.trim()).filter(isListingType)
  : [...PLACE_TYPES, 'events'];

const fixture = values.fixture
  ? (JSON.parse(readFileSync(values.fixture, 'utf8')) as Record<string, RawItem[]>)
  : null;

async function load(type: ListingType): Promise<RawItem[]> {
  if (fixture) return fixture[type] ?? [];
  return fetchRawListings(type, (p, of) => process.stdout.write(`\r${type} ${p}/${of}   `));
}

const latest = (a: Date | null, b: Date | null) => (a && b ? (a > b ? a : b) : a ?? b);

/** Everything the source owns on a place. Slug, inclusion and our copy are not here. */
function placeFields(v: VjPlace) {
  const { externalId: _id, type: _t, category: _c, modifiedAt: _m, portalSyncedAt: _p, ...fields } = v;
  return fields;
}

/** The venue link is a source-derived field like any other, so a person's correction is locked and kept. */
function eventFields(v: VjEvent, venue: Place | null) {
  const { externalId: _id, modifiedAt: _m, portalSyncedAt: _p, ...fields } = v;
  return { ...fields, placeId: venue?.id ?? null };
}

async function upsertRecord(type: ListingType, raw: RawItem, modifiedAt: Date | null, portalSyncedAt: Date | null) {
  const [row] = await db
    .insert(sourceRecords)
    .values({ source: SOURCE, externalType: type, externalId: String(raw.id), payload: raw, modifiedAt, portalSyncedAt })
    .onConflictDoUpdate({
      target: [sourceRecords.source, sourceRecords.externalType, sourceRecords.externalId],
      set: { payload: raw, modifiedAt, portalSyncedAt, present: true, fetchedAt: new Date() },
    })
    .returning();
  return row!;
}

const counts = { created: 0, updated: 0, unchanged: 0, linked: 0, unpinned: 0 };

async function importPlaces(type: PlaceType, raws: RawItem[], all: Place[]) {
  const taken = new Set(all.map((p) => p.slug));
  for (const raw of raws) {
    const v = toPlace(raw, type);
    if (!v.name) continue;
    if (v.lat === null) counts.unpinned += 1;
    const record = await upsertRecord(type, raw, v.modifiedAt, v.portalSyncedAt);
    const stamp = { source: SOURCE, ref: `${type}/${v.externalId}`, at: new Date().toISOString() };

    let place = record.placeId ? all.find((p) => p.id === record.placeId) : undefined;
    // Second listing for one front door: a hotel's restaurant.
    if (!place) {
      place = all.find((p) => isSamePlace(p, v));
      if (place) counts.linked += 1;
    }

    if (!place) {
      const slug = uniqueSlug(v.name, (s) => taken.has(s), v.parish);
      taken.add(slug);
      const { fieldSources } = mergeFromSource({}, placeFields(v), { locked: [], fieldSources: {}, stamp });
      const [created] = await db
        .insert(places)
        .values({ ...placeFields(v), slug, category: v.category, fieldSources, sourceModifiedAt: v.modifiedAt })
        .returning();
      all.push(created!);
      await db.update(sourceRecords).set({ placeId: created!.id }).where(eq(sourceRecords.id, record.id));
      counts.created += 1;
      continue;
    }

    const { patch, fieldSources, changed } = mergeFromSource<Record<string, unknown>>(place, placeFields(v), {
      locked: place.lockedFields,
      fieldSources: place.fieldSources,
      stamp,
    });
    const sourceModifiedAt = latest(place.sourceModifiedAt, v.modifiedAt);
    const [updated] = await db
      .update(places)
      .set({ ...(patch as Partial<Place>), fieldSources, sourceModifiedAt, ...(changed.length ? { updatedAt: new Date() } : {}) })
      .where(eq(places.id, place.id))
      .returning();
    all.splice(all.indexOf(place), 1, updated!);
    if (record.placeId !== place.id) {
      await db.update(sourceRecords).set({ placeId: place.id }).where(eq(sourceRecords.id, record.id));
    }
    counts[changed.length ? 'updated' : 'unchanged'] += 1;
  }
}

async function importEvents(raws: RawItem[], allPlaces: Place[]) {
  const existing: Event[] = await db.select().from(events);
  const taken = new Set(existing.map((e) => e.slug));
  for (const raw of raws) {
    const v = toEvent(raw);
    if (!v.title) continue;
    const record = await upsertRecord('events', raw, v.modifiedAt, v.portalSyncedAt);
    const stamp = { source: SOURCE, ref: `events/${v.externalId}`, at: new Date().toISOString() };
    const venue = matchVenue(v.venue, v, allPlaces);
    const current = record.eventId ? existing.find((e) => e.id === record.eventId) : undefined;

    if (!current) {
      const slug = uniqueSlug(`${v.title} ${v.startsOn?.slice(0, 4) ?? ''}`, (s) => taken.has(s));
      taken.add(slug);
      const { fieldSources } = mergeFromSource({}, eventFields(v, venue), { locked: [], fieldSources: {}, stamp });
      const [created] = await db
        .insert(events)
        .values({ ...eventFields(v, venue), slug, fieldSources, sourceModifiedAt: v.modifiedAt })
        .returning();
      await db.update(sourceRecords).set({ eventId: created!.id }).where(eq(sourceRecords.id, record.id));
      counts.created += 1;
      continue;
    }
    const { patch, fieldSources, changed } = mergeFromSource<Record<string, unknown>>(current, eventFields(v, venue), {
      locked: current.lockedFields,
      fieldSources: current.fieldSources,
      stamp,
    });
    await db
      .update(events)
      .set({
        ...(patch as Partial<Event>),
        fieldSources,
        sourceModifiedAt: latest(current.sourceModifiedAt, v.modifiedAt),
        ...(changed.length ? { updatedAt: new Date() } : {}),
      })
      .where(eq(events.id, current.id));
    counts[changed.length ? 'updated' : 'unchanged'] += 1;
  }
}

/** Records this run did not see are gone from the source. Kept, flagged. */
async function markMissing(type: ListingType, seen: RawItem[]) {
  const ids = seen.map((r) => String(r.id));
  const where = and(eq(sourceRecords.source, SOURCE), eq(sourceRecords.externalType, type));
  const gone = await db
    .update(sourceRecords)
    .set({ present: false })
    .where(ids.length ? and(where, notInArray(sourceRecords.externalId, ids)) : where)
    .returning({ id: sourceRecords.id });
  return gone.length;
}

const allPlaces: Place[] = await db.select().from(places);
let missing = 0;
// Places first, so events can find their venue.
for (const type of [...types].sort((a, b) => Number(a === 'events') - Number(b === 'events'))) {
  const raws = await load(type);
  if (type === 'events') await importEvents(raws, allPlaces);
  else await importPlaces(type, raws, allPlaces);
  // A fixture is a sample, not the whole directory; only a live run knows what is gone.
  if (!fixture) missing += await markMissing(type, raws);
  console.log(`\r${type}: ${raws.length} listings`);
}

console.log(
  `created ${counts.created}, updated ${counts.updated}, unchanged ${counts.unchanged}, ` +
    `linked to an existing place ${counts.linked}, no usable pin ${counts.unpinned}, no longer listed ${missing}`,
);
await client.end();
