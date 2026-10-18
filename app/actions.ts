'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { INCLUSIONS, events, places } from '@/lib/db/schema';

const kindSchema = z.enum(['event', 'venue']);

const inclusionSchema = z.object({
  kind: kindSchema,
  id: z.string().uuid(),
  inclusion: z.enum(INCLUSIONS),
});

/** Include, exclude or reset one entry. Inclusion is only ever set by a person. */
export async function setInclusion(form: FormData) {
  const { kind, id, inclusion } = inclusionSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : places;
  await db.update(table).set({ inclusion, updatedAt: new Date() }).where(eq(table.id, id));
  revalidatePath('/', 'layout');
}

const editorialSchema = z.object({
  kind: kindSchema,
  id: z.string().uuid(),
  guideCopy: z.string().max(4000),
  inclusionNote: z.string().max(500),
});

/** Our copy and our note. Neither is a source field, so an import never touches them. */
export async function saveEditorial(form: FormData) {
  const { kind, id, guideCopy, inclusionNote } = editorialSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : places;
  await db
    .update(table)
    .set({ guideCopy: guideCopy.trim() || null, inclusionNote: inclusionNote.trim() || null, updatedAt: new Date() })
    .where(eq(table.id, id));
  revalidatePath('/', 'layout');
}

const venueSchema = z.object({
  id: z.string().uuid(),
  placeId: z.union([z.string().uuid(), z.literal('')]),
});

/**
 * Link an event to its venue by hand. The link is locked, so the next
 * import keeps a person's answer instead of its own guess.
 */
export async function setEventVenue(form: FormData) {
  const { id, placeId } = venueSchema.parse(Object.fromEntries(form));
  const [current] = await db.select({ locked: events.lockedFields }).from(events).where(eq(events.id, id));
  if (!current) return;
  await db
    .update(events)
    .set({
      placeId: placeId || null,
      lockedFields: [...new Set([...current.locked, 'placeId'])],
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
  revalidatePath('/', 'layout');
}
