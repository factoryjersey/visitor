import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sourceRecords } from '@/lib/db/schema';
import { needsThird, recordWords, thirdKey, type Third } from '@/lib/domain/third-person';
import { thirdPerson } from './third-person';

/**
 * After the day's import, each of Visit Jersey's events and tours whose
 * short description speaks in the first person ("join us", "our team")
 * gets a third-person copy beside it in its record (payload._third),
 * otherwise word for word. Only new or changed descriptions are sent.
 */
export async function fillThirdPerson(limit = 500): Promise<{ written: number; wanted: number }> {
  const rows = await db
    .select({ id: sourceRecords.id, payload: sourceRecords.payload })
    .from(sourceRecords)
    .where(and(eq(sourceRecords.source, 'visit_jersey'), inArray(sourceRecords.externalType, ['events', 'tours-and-activities']), eq(sourceRecords.present, true)));
  const todo = rows
    .map((r) => ({ id: r.id, ...recordWords(r.payload) }))
    .filter((x): x is typeof x & { text: string } => !!x.text && needsThird(x.text) && x.third?.key !== thirdKey(x.text))
    .slice(0, limit);
  const made = await thirdPerson(todo.map(({ id, organiser, title, text }) => ({ id, organiser, title, text })));
  for (const x of todo) {
    const text = made.get(x.id);
    if (!text) continue;
    const kept: Third = { key: thirdKey(x.text), text };
    await db.update(sourceRecords).set({ payload: sql`${sourceRecords.payload} || jsonb_build_object('_third', ${JSON.stringify(kept)}::jsonb)` }).where(eq(sourceRecords.id, x.id));
  }
  return { written: made.size, wanted: todo.length };
}
