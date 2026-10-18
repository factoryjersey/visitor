/**
 * Events from sources beyond Visit Jersey, after it has run:
 *
 *   pnpm import:events                     every source
 *   pnpm import:events --only eventbrite   one of: eventbrite, ticketsolve-artscentre, ticketsolve-operahouse
 *   pnpm import:events --only ticketsolve-artscentre --fixture tests/fixtures/ticketsolve-shows.xml
 *
 * Each source's records are kept whole in source_records, like Visit
 * Jersey's. An event we already have from another source, the same title
 * on the same day (lib/domain/event-match.ts), is linked rather than
 * repeated, and the second source only fills what the first left empty.
 *
 * The Arts Centre and the Opera House are curated, so their shows go
 * straight on the site. Anyone can post on Eventbrite, so its events wait
 * in /admin/review until staff approve them.
 */
import '@/lib/load-env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { and, eq, notInArray } from 'drizzle-orm';
import { client, db } from '@/lib/db';
import { events, places, sourceRecords, type Event, type Place, type Review } from '@/lib/db/schema';
import { findSameEvent } from '@/lib/domain/event-match';
import { mergeFromSource } from '@/lib/domain/merge';
import { normaliseName } from '@/lib/domain/same-place';
import { uniqueSlug } from '@/lib/domain/slug';
import { matchVenue } from '@/lib/domain/venue-match';
import { ldEvents, eventbriteId, isJerseyInPerson, toEvent as fromEventbrite, type LdEvent } from '@/lib/integrations/eventbrite/parse';
import type { VjEvent } from '@/lib/integrations/jersey-com/parse';
import { FEEDS, parseShows } from '@/lib/integrations/ticketsolve/parse';

const { values } = parseArgs({ options: { only: { type: 'string' }, fixture: { type: 'string' } } });

const UA = 'VisitorGuideJersey/1.0 (+https://visitor-production-bdb2.up.railway.app; events listing for the Jersey visitor guide)';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url: string): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml' }, signal: AbortSignal.timeout(30_000) });
      // Asked to slow down: wait a good while, not a moment.
      if (res.status === 429 && attempt < 3) {
        await pause(60_000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      if (attempt >= 3) throw e;
      await pause(2000 * attempt);
    }
  }
}

type Item = { v: VjEvent; raw: unknown };

async function loadTicketsolve(feed: (typeof FEEDS)[number]): Promise<Item[]> {
  const xml = values.fixture ? readFileSync(values.fixture, 'utf8') : await fetchText(`https://${feed.host}/shows.xml`);
  return parseShows(xml, feed).map((v) => ({ v, raw: { feed: feed.host, show: v.externalId, title: v.title, dates: v.dates } }));
}

const PAGE_FRESH_DAYS = 7;

/**
 * Every Jersey listing page, then each event's own page for its times and
 * price. An event's page is fetched when it is new to us or our copy is
 * over a week old, so a day's run asks for a few dozen pages rather than
 * all of them; Eventbrite turns away a few hundred in a row.
 */
async function loadEventbrite(): Promise<Item[]> {
  const kept = new Map<string, { page: LdEvent | null; fetchedAt: Date }>();
  for (const r of await db
    .select({ id: sourceRecords.externalId, payload: sourceRecords.payload, fetchedAt: sourceRecords.fetchedAt })
    .from(sourceRecords)
    .where(eq(sourceRecords.source, 'eventbrite'))) {
    const payload = r.payload as { page?: LdEvent | null; pageFetchedAt?: string | null };
    // Records from before pageFetchedAt was kept: the record's own time is when the page was read.
    if (payload?.page) kept.set(r.id, { page: payload.page, fetchedAt: payload.pageFetchedAt ? new Date(payload.pageFetchedAt) : r.fetchedAt });
  }
  const freshAfter = Date.now() - PAGE_FRESH_DAYS * 86_400_000;

  const listed = new Map<string, LdEvent>();
  for (let page = 1; page <= 30; page += 1) {
    const found = ldEvents(await fetchText(`https://www.eventbrite.co.uk/d/jersey/all-events/?page=${page}`));
    if (!found.length) break;
    for (const e of found) {
      const id = eventbriteId(e.url);
      if (id && isJerseyInPerson(e)) listed.set(id, e);
    }
    process.stdout.write(`\reventbrite listing page ${page}: ${listed.size} events   `);
    await pause(1000);
  }
  const out: Item[] = [];
  let fetched = 0;
  for (const [id, listing] of listed) {
    const old = kept.get(id);
    let page = old?.page ?? null;
    let pageFetchedAt = old?.fetchedAt.toISOString() ?? null;
    if (!old || old.fetchedAt.getTime() < freshAfter) {
      try {
        page = ldEvents(await fetchText(listing.url!))[0] ?? null;
        pageFetchedAt = new Date().toISOString();
      } catch (e) {
        console.warn(`\n${listing.url}: ${(e as Error).message}; using ${old ? 'our last copy' : 'the listing alone'}`);
      }
      fetched += 1;
      process.stdout.write(`\reventbrite event pages fetched: ${fetched}   `);
      await pause(2000);
    }
    const v = fromEventbrite(listing, page);
    if (v) out.push({ v, raw: { listing, page, pageFetchedAt } });
  }
  return out;
}

const counts = { created: 0, linked: 0, updated: 0, unchanged: 0 };

/** The source's own fields for the events table. */
function eventFields(v: VjEvent, venue: Place | null) {
  const { externalId: _id, modifiedAt: _m, portalSyncedAt: _p, ...fields } = v;
  return { ...fields, placeId: venue?.id ?? null, lat: v.lat ?? venue?.lat ?? null, lon: v.lon ?? venue?.lon ?? null };
}

async function importSource(source: string, items: Item[], review: Review, allPlaces: Place[], existing: Event[]) {
  const taken = new Set(existing.map((e) => e.slug));
  for (const { v, raw } of items) {
    const [record] = await db
      .insert(sourceRecords)
      .values({ source, externalType: 'events', externalId: v.externalId, payload: raw })
      .onConflictDoUpdate({
        target: [sourceRecords.source, sourceRecords.externalType, sourceRecords.externalId],
        set: { payload: raw, present: true, fetchedAt: new Date() },
      })
      .returning();
    const stamp = { source, ref: `events/${v.externalId}`, at: new Date().toISOString() };
    // By pin and name where the source has a pin; by name alone for a theatre's own feed.
    const venue =
      matchVenue(v.venue, v, allPlaces) ??
      (v.venueName ? allPlaces.find((p) => normaliseName(p.name) === normaliseName(v.venueName!)) ?? null : null);
    const fields = eventFields(v, venue);

    let current = record!.eventId ? existing.find((e) => e.id === record!.eventId) : undefined;
    if (!current) {
      current = findSameEvent({ title: v.title, dates: v.dates, placeId: venue?.id ?? null }, existing) ?? undefined;
      if (current) {
        await db.update(sourceRecords).set({ eventId: current.id }).where(eq(sourceRecords.id, record!.id));
        counts.linked += 1;
      }
    }

    if (!current) {
      const slug = uniqueSlug(`${v.title} ${v.startsOn?.slice(0, 4) ?? ''}`, (s) => taken.has(s));
      taken.add(slug);
      const { fieldSources } = mergeFromSource({}, fields, { locked: [], fieldSources: {}, stamp });
      const [created] = await db.insert(events).values({ ...fields, slug, fieldSources, review }).returning();
      await db.update(sourceRecords).set({ eventId: created!.id }).where(eq(sourceRecords.id, record!.id));
      existing.push(created!);
      counts.created += 1;
      continue;
    }

    // The source that brought the event writes it; any other fills its gaps.
    const primary = current.fieldSources.title?.source === source;
    const { patch, fieldSources, changed } = mergeFromSource<Record<string, unknown>>(current, fields, {
      locked: current.lockedFields,
      fieldSources: current.fieldSources,
      stamp,
      fillOnly: !primary,
    });
    if (changed.length) {
      const [updated] = await db
        .update(events)
        .set({ ...(patch as Partial<Event>), fieldSources, updatedAt: new Date() })
        .where(eq(events.id, current.id))
        .returning();
      existing.splice(existing.indexOf(current), 1, updated!);
    }
    counts[changed.length ? 'updated' : 'unchanged'] += 1;
  }

  // What the source no longer lists: kept, flagged, as for Visit Jersey.
  if (!values.fixture) {
    const ids = items.map((i) => i.v.externalId);
    const where = and(eq(sourceRecords.source, source), eq(sourceRecords.externalType, 'events'));
    await db.update(sourceRecords).set({ present: false }).where(ids.length ? and(where, notInArray(sourceRecords.externalId, ids)) : where);
  }
}

const SOURCES: { source: string; review: Review; load: () => Promise<Item[]> }[] = [
  // The theatres first: when Eventbrite lists the same show, theirs is the record and Eventbrite fills gaps.
  ...FEEDS.map((feed) => ({ source: feed.source, review: 'approved' as const, load: () => loadTicketsolve(feed) })),
  { source: 'eventbrite', review: 'pending', load: loadEventbrite },
];

const allPlaces = await db.select().from(places);
const existing = await db.select().from(events);
let failed = 0;
for (const s of SOURCES.filter((s) => !values.only || s.source === values.only)) {
  // One source down must not stop the others.
  try {
    const before = { ...counts };
    const items = await s.load();
    await importSource(s.source, items, s.review, allPlaces, existing);
    console.log(
      `\r${s.source}: ${items.length} events; created ${counts.created - before.created}, linked to one we had ${counts.linked - before.linked}, ` +
        `updated ${counts.updated - before.updated}, unchanged ${counts.unchanged - before.unchanged}`,
    );
  } catch (e) {
    failed += 1;
    console.error(`\r${s.source} failed: ${(e as Error).message}`);
  }
}
await client.end();
if (failed) process.exitCode = 1;
