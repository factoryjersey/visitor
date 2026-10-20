import { and, eq, gte, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, experiences } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { applyFallbacks } from '@/lib/images/fallback';
import { stockLibrary, stockQuery } from './images';

/**
 * Every public event and tour still to come that has no picture gets its
 * organiser's or venue's fallback picture (lib/images/fallback.ts), or
 * failing that a stock one, credited, after the day's import. Recorded as the "stock"
 * source, so a source that sends nothing leaves it be, a source's own
 * picture replaces it, and a person's choice (a locked field) is never
 * touched.
 */
export async function fillStockImages(): Promise<{ fallbacks: number; events: number; tours: number; source: string }> {
  const fallbacks = await applyFallbacks();
  const library = stockLibrary(env.PEXELS_API_KEY);
  const today = new Date().toISOString().slice(0, 10);
  const notLocked = (col: typeof events.lockedFields | typeof experiences.lockedFields) => sql`not ('headerImage' = any(${col}))`;
  const stamp = (query: string) => ({ source: 'stock', ref: `${library.source.toLowerCase()}/${query}`, at: new Date().toISOString() });

  const bare = await db
    .select({ id: events.id, title: events.title, organiser: events.organiser, eventTypes: events.eventTypes, fieldSources: events.fieldSources })
    .from(events)
    .where(and(isNull(events.headerImage), gte(events.endsOn, today), eq(events.review, 'approved'), ne(events.inclusion, 'excluded'), notLocked(events.lockedFields)));
  let filledEvents = 0;
  for (const e of bare) {
    const image = await library.pick(e);
    if (!image) continue;
    await db.update(events).set({ headerImage: image, fieldSources: { ...e.fieldSources, headerImage: stamp(stockQuery(e)) } }).where(eq(events.id, e.id));
    filledEvents += 1;
  }

  const bareTours = await db
    .select({ id: experiences.id, title: experiences.title, genre: experiences.genre, fieldSources: experiences.fieldSources })
    .from(experiences)
    .where(and(isNull(experiences.headerImage), eq(experiences.review, 'approved'), ne(experiences.inclusion, 'excluded'), notLocked(experiences.lockedFields)));
  let filledTours = 0;
  for (const t of bareTours) {
    const image = await library.pick(t);
    if (!image) continue;
    await db.update(experiences).set({ headerImage: image, fieldSources: { ...t.fieldSources, headerImage: stamp(stockQuery(t)) } }).where(eq(experiences.id, t.id));
    filledTours += 1;
  }
  return { fallbacks, events: filledEvents, tours: filledTours, source: library.source };
}
