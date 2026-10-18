'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { INCLUSIONS, LISTING_SIZES, events, places } from '@/lib/db/schema';

const kindSchema = z.enum(['event', 'venue']);

const inclusionSchema = z.object({
  kind: kindSchema,
  id: z.string().uuid(),
  inclusion: z.enum(INCLUSIONS),
});

/** Include, exclude or reset one entry. Inclusion is only ever set by a person. */
export async function setInclusion(form: FormData) {
  const user = await requireUser();
  const { kind, id, inclusion } = inclusionSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : places;
  const now = new Date();
  await db
    .update(table)
    .set({ inclusion, inclusionSetBy: user.email, inclusionSetAt: now, updatedAt: now })
    .where(eq(table.id, id));
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
  const user = await requireUser();
  const { kind, id, guideCopy, inclusionNote } = editorialSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : places;
  const now = new Date();
  await db
    .update(table)
    .set({
      guideCopy: guideCopy.trim() || null,
      inclusionNote: inclusionNote.trim() || null,
      editedBy: user.email,
      editedAt: now,
      updatedAt: now,
    })
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
  const user = await requireUser();
  const { id, placeId } = venueSchema.parse(Object.fromEntries(form));
  const [current] = await db.select({ locked: events.lockedFields }).from(events).where(eq(events.id, id));
  if (!current) return;
  await db
    .update(events)
    .set({
      placeId: placeId || null,
      lockedFields: [...new Set([...current.locked, 'placeId'])],
      editedBy: user.email,
      editedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
  revalidatePath('/', 'layout');
}

const eventPrintSchema = z.object({
  id: z.string().uuid(),
  printDates: z.string().max(200),
  printTimes: z.string().max(200),
  printPrice: z.string().max(200),
});

/** What the guide prints instead of the computed dates, times or price. Blank means use the computed one. */
export async function saveEventPrint(form: FormData) {
  const user = await requireUser();
  const v = eventPrintSchema.parse(Object.fromEntries(form));
  const now = new Date();
  await db
    .update(events)
    .set({
      printDates: v.printDates.trim() || null,
      printTimes: v.printTimes.trim() || null,
      printPrice: v.printPrice.trim() || null,
      editedBy: user.email,
      editedAt: now,
      updatedAt: now,
    })
    .where(eq(events.id, v.id));
  revalidatePath('/', 'layout');
}

const venueGuideSchema = z.object({
  id: z.string().uuid(),
  guideSection: z.string().max(60),
  guideArea: z.string().max(60),
  guideLabel: z.string().max(40),
  listingSize: z.enum(LISTING_SIZES),
});

/** Where a venue sits in the guide, under which label, and how much room it gets. */
export async function saveVenueGuide(form: FormData) {
  const user = await requireUser();
  const v = venueGuideSchema.parse(Object.fromEntries(form));
  const now = new Date();
  await db
    .update(places)
    .set({
      guideSection: v.guideSection.trim() || null,
      guideArea: v.guideArea.trim() || null,
      guideLabel: v.guideLabel.trim() || null,
      listingSize: v.listingSize,
      editedBy: user.email,
      editedAt: now,
      updatedAt: now,
    })
    .where(eq(places.id, v.id));
  revalidatePath('/', 'layout');
}
