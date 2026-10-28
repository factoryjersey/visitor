import { createHash } from 'node:crypto';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { places } from '@/lib/db/schema';
import { guideVenue } from '@/lib/domain/guide-entry';
import { venueLines } from './venue-line';

/** Which words a line was written from, and to which brief: a new one only when either changes. */
const BRIEF = 'venue-line-1';
const wordsOf = (p: { guideCopy: string | null; summary: string | null; description: string | null }) =>
  [p.guideCopy, p.summary, p.description].filter(Boolean).join('\n\n');
export const venueLineKey = (p: { name: string; guideCopy: string | null; summary: string | null; description: string | null }) =>
  createHash('sha1').update([BRIEF, p.name, wordsOf(p)].join('\u0000')).digest('hex');

/**
 * After the day's import, every public venue with words to go on gets
 * its one-line description, or a new one if its words have changed. One
 * a person has written (a locked field) is left alone. limit keeps a
 * first run, which writes them all, to a size.
 */
export async function fillVenueLines(limit = 1000): Promise<{ written: number; wanted: number }> {
  const rows = await db
    .select()
    .from(places)
    .where(and(eq(places.review, 'approved'), ne(places.inclusion, 'excluded'), sql`not ('guideLine' = any(${places.lockedFields}))`));
  const todo = rows.filter((p) => wordsOf(p) && p.guideLineKey !== venueLineKey(p)).slice(0, limit);
  const lines = await venueLines(todo.map((p) => ({ id: p.id, name: p.name, section: guideVenue(p).section, copy: wordsOf(p) })));
  for (const p of todo) {
    const line = lines.get(p.id);
    if (line) await db.update(places).set({ guideLine: line, guideLineKey: venueLineKey(p) }).where(eq(places.id, p.id));
  }
  return { written: lines.size, wanted: todo.length };
}
