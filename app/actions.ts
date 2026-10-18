'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { INCLUSIONS, LISTING_SIZES, events, experiences, places, providers } from '@/lib/db/schema';
import { GENRES } from '@/lib/domain/genre';
import { OCCURRENCES } from '@/lib/domain/occurrence';

const kindSchema = z.enum(['event', 'venue', 'experience']);

const TABLES = { event: events, venue: places, experience: experiences } as const;

const inclusionSchema = z.object({
  kind: kindSchema,
  id: z.string().uuid(),
  inclusion: z.enum(INCLUSIONS),
});

/** Include, exclude or reset one entry. Inclusion is only ever set by a person. */
export async function setInclusion(form: FormData) {
  const user = await requireUser();
  const { kind, id, inclusion } = inclusionSchema.parse(Object.fromEntries(form));
  const table = TABLES[kind];
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
  const table = TABLES[kind];
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

/** Lock a source-derived field after a person sets it, so the next import keeps their answer. */
async function lockAndSet(table: typeof events | typeof experiences, id: string, field: string, value: Record<string, unknown>, email: string) {
  const [row] = await db.select({ locked: table.lockedFields }).from(table).where(eq(table.id, id));
  if (!row) return;
  const now = new Date();
  await db
    .update(table)
    .set({ ...value, lockedFields: [...new Set([...row.locked, field])], editedBy: email, editedAt: now, updatedAt: now })
    .where(eq(table.id, id));
}

const occurrenceSchema = z.object({
  kind: z.enum(['event', 'experience']),
  id: z.string().uuid(),
  occurrence: z.enum(OCCURRENCES),
});

/** Correct the one-off / specific dates / regular / ongoing call. Locked against the next import. */
export async function setOccurrence(form: FormData) {
  const user = await requireUser();
  const { kind, id, occurrence } = occurrenceSchema.parse(Object.fromEntries(form));
  await lockAndSet(kind === 'event' ? events : experiences, id, 'occurrence', { occurrence }, user.email);
  revalidatePath('/', 'layout');
}

const genreSchema = z.object({ id: z.string().uuid(), genre: z.union([z.enum(GENRES), z.literal('')]) });

/** Which genre a tour prints under. Locked against the next import. */
export async function setGenre(form: FormData) {
  const user = await requireUser();
  const { id, genre } = genreSchema.parse(Object.fromEntries(form));
  await lockAndSet(experiences, id, 'genre', { genre: genre || null }, user.email);
  revalidatePath('/', 'layout');
}

const tourPrintSchema = z.object({ id: z.string().uuid(), printDates: z.string().max(200), printTimes: z.string().max(200) });

export async function saveTourPrint(form: FormData) {
  const user = await requireUser();
  const v = tourPrintSchema.parse(Object.fromEntries(form));
  const now = new Date();
  await db
    .update(experiences)
    .set({ printDates: v.printDates.trim() || null, printTimes: v.printTimes.trim() || null, editedBy: user.email, editedAt: now, updatedAt: now })
    .where(eq(experiences.id, v.id));
  revalidatePath('/', 'layout');
}

const codeSchema = z.object({ id: z.string().uuid(), code: z.string().max(8).regex(/^[A-Za-z]*$/) });

/** A provider's key code. Ours, kept between editions; blank clears it. */
export async function setProviderCode(form: FormData): Promise<void> {
  await requireUser();
  const { id, code } = codeSchema.parse(Object.fromEntries(form));
  const clean = code.trim().toUpperCase() || null;
  if (clean) {
    const [clash] = await db.select({ id: providers.id }).from(providers).where(eq(providers.code, clean));
    if (clash && clash.id !== id) return;
  }
  await db.update(providers).set({ code: clean, updatedAt: new Date() }).where(eq(providers.id, id));
  revalidatePath('/', 'layout');
}

const highlightSchema = z.object({ kind: z.enum(['event', 'experience']), id: z.string().uuid(), highlight: z.enum(['true', 'false']) });

/** Make something a highlight: a full page in the guide, featured first online. */
export async function setHighlight(form: FormData) {
  const user = await requireUser();
  const { kind, id, highlight } = highlightSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : experiences;
  const now = new Date();
  await db.update(table).set({ highlight: highlight === 'true', editedBy: user.email, editedAt: now, updatedAt: now }).where(eq(table.id, id));
  revalidatePath('/', 'layout');
}
