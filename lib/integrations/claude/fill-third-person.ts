import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sourceRecords } from '@/lib/db/schema';
import { ROOM, recordWords, thirdKey, wantsEdit, type Third, type TheirType } from '@/lib/domain/third-person';
import { thirdPerson } from './third-person';

/**
 * After the day's import, each of Visit Jersey's events and tours gets its
 * printed versions beside it in its record (payload._third): the short
 * description in the third person, and the longer one for the grid of six
 * (lib/domain/third-person.ts). Only new or changed descriptions are sent.
 */
export async function fillThirdPerson(limit = 500): Promise<{ written: number; longer: number; wanted: number }> {
  const rows = await db
    .select({ id: sourceRecords.id, type: sourceRecords.externalType, payload: sourceRecords.payload })
    .from(sourceRecords)
    .where(and(eq(sourceRecords.source, 'visit_jersey'), inArray(sourceRecords.externalType, ['events', 'tours-and-activities']), eq(sourceRecords.present, true)));
  const todo = rows
    .map((r) => ({ id: r.id, room: ROOM[r.type as TheirType], ...recordWords(r.payload) }))
    .filter((x): x is typeof x & { text: string } => !!x.text && wantsEdit(x.text, x.long) && x.third?.key !== thirdKey(x.text, x.long))
    .slice(0, limit);
  const made = await thirdPerson(todo.map(({ id, organiser, title, text, long, room }) => ({ id, organiser, title, text, long, room })));
  for (const x of todo) {
    const m = made.get(x.id);
    if (!m) continue;
    const kept: Third = { key: thirdKey(x.text, x.long), text: m.short, ...(m.more ? { more: m.more } : {}) };
    await db.update(sourceRecords).set({ payload: sql`${sourceRecords.payload} || jsonb_build_object('_third', ${JSON.stringify(kept)}::jsonb)` }).where(eq(sourceRecords.id, x.id));
  }
  return { written: made.size, longer: [...made.values()].filter((m) => m.more).length, wanted: todo.length };
}
