'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/auth/session';
import { INCLUSIONS, LISTING_SIZES, events, experiences, organiserProfiles, places, providers, type Image } from '@/lib/db/schema';
import { applyFallbacks } from '@/lib/images/fallback';
import { organiserKey } from '@/lib/domain/organiser';
import { storeListingImage } from '@/lib/images/upload';
import { guideSelection, includedExperiences } from '@/lib/db/queries';
import { guideEvent, guideTour } from '@/lib/domain/guide-entry';
import { EVENT_TYPES } from '@/lib/domain/categorise';
import { GENRES } from '@/lib/domain/genre';
import { OCCURRENCES } from '@/lib/domain/occurrence';

const kindSchema = z.enum(['event', 'venue', 'experience']);

const TABLES = { event: events, venue: places, experience: experiences } as const;

const inclusionSchema = z.object({
  kind: kindSchema,
  id: z.string().uuid(),
  inclusion: z.enum(INCLUSIONS),
});

/** Include, exclude or reset one entry. Inclusion is only ever set by a person, and only on an approved listing. */
export async function setInclusion(form: FormData) {
  const user = await requireStaff();
  const { kind, id, inclusion } = inclusionSchema.parse(Object.fromEntries(form));
  const table = TABLES[kind];
  const now = new Date();
  await db
    .update(table)
    .set({ inclusion, inclusionSetBy: user.email, inclusionSetAt: now, updatedAt: now })
    .where(and(eq(table.id, id), eq(table.review, 'approved')));
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
  const user = await requireStaff();
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
  const user = await requireStaff();
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
  printLine: z.string().max(200),
  guidePicture: z.literal('on').optional(),
});

/**
 * What the guide prints instead of the computed dates, times or price.
 * Blank means use the computed one. A guide line set by hand is kept
 * from Claude; cleared, Claude writes one again after the next import.
 */
export async function saveEventPrint(form: FormData) {
  const user = await requireStaff();
  const v = eventPrintSchema.parse(Object.fromEntries(form));
  const [row] = await db.select({ printLine: events.printLine, lockedFields: events.lockedFields }).from(events).where(eq(events.id, v.id));
  if (!row) return;
  const printLine = v.printLine.trim() || null;
  const others = row.lockedFields.filter((f) => f !== 'printLine');
  const lockedFields = printLine === row.printLine ? row.lockedFields : printLine ? [...others, 'printLine'] : others;
  const now = new Date();
  await db
    .update(events)
    .set({
      printDates: v.printDates.trim() || null,
      printTimes: v.printTimes.trim() || null,
      printPrice: v.printPrice.trim() || null,
      printLine,
      ...(printLine ? {} : { printLineKey: null }),
      guidePicture: v.guidePicture === 'on',
      lockedFields,
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
  const user = await requireStaff();
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

const venueTagsSchema = z.object({
  id: z.string().uuid(),
  recommendedIn: z.string().trim().max(60),
  client: z.literal('on').optional(),
  clientNote: z.string().trim().max(1000),
});

const googlePlaceSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(['set', 'none', 'rematch']),
  placeId: z.string().trim().max(200).regex(/^[A-Za-z0-9_-]*$/).optional(),
});

/**
 * A venue's place on Google, set by a person: a place ID they checked, or
 * none at all (no reviews panel); both are locked so the nightly match
 * leaves them. Rematch hands it back to the nightly match.
 */
export async function setGooglePlace(form: FormData) {
  const user = await requireStaff();
  const v = googlePlaceSchema.parse(Object.fromEntries(form));
  if (v.mode === 'set' && !v.placeId) return;
  const now = new Date();
  const set =
    v.mode === 'set' ? { googlePlaceId: v.placeId!, googleLocked: true, googleCheckedAt: now }
    : v.mode === 'none' ? { googlePlaceId: null, googleLocked: true, googleCheckedAt: now }
    : { googlePlaceId: null, googleLocked: false, googleCheckedAt: null };
  await db.update(places).set({ ...set, editedBy: user.email, editedAt: now, updatedAt: now }).where(eq(places.id, v.id));
  revalidatePath('/', 'layout');
}

/** Visitor recommended (public) and client (ours only). */
export async function saveVenueTags(form: FormData) {
  const user = await requireStaff();
  const v = venueTagsSchema.parse(Object.fromEntries(form));
  const now = new Date();
  await db
    .update(places)
    .set({ recommendedIn: v.recommendedIn || null, client: v.client === 'on', clientNote: v.clientNote || null, editedBy: user.email, editedAt: now, updatedAt: now })
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
  const user = await requireStaff();
  const { kind, id, occurrence } = occurrenceSchema.parse(Object.fromEntries(form));
  await lockAndSet(kind === 'event' ? events : experiences, id, 'occurrence', { occurrence }, user.email);
  revalidatePath('/', 'layout');
}

const genreSchema = z.object({ id: z.string().uuid(), genre: z.union([z.enum(GENRES), z.literal('')]) });

/** Which genre a tour prints under. Locked against the next import. */
export async function setGenre(form: FormData) {
  const user = await requireStaff();
  const { id, genre } = genreSchema.parse(Object.fromEntries(form));
  await lockAndSet(experiences, id, 'genre', { genre: genre || null }, user.email);
  revalidatePath('/', 'layout');
}

const tourPrintSchema = z.object({ id: z.string().uuid(), printDates: z.string().max(200), printTimes: z.string().max(200), guidePicture: z.literal('on').optional() });

export async function saveTourPrint(form: FormData) {
  const user = await requireStaff();
  const v = tourPrintSchema.parse(Object.fromEntries(form));
  const now = new Date();
  await db
    .update(experiences)
    .set({ printDates: v.printDates.trim() || null, printTimes: v.printTimes.trim() || null, guidePicture: v.guidePicture === 'on', editedBy: user.email, editedAt: now, updatedAt: now })
    .where(eq(experiences.id, v.id));
  revalidatePath('/', 'layout');
}

const codeSchema = z.object({ id: z.string().uuid(), code: z.string().max(8).regex(/^[A-Za-z]*$/) });

/** A provider's key code. Ours, kept between editions; blank clears it. */
export async function setProviderCode(form: FormData): Promise<void> {
  await requireStaff();
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
  const user = await requireStaff();
  const { kind, id, highlight } = highlightSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : experiences;
  const now = new Date();
  await db.update(table).set({ highlight: highlight === 'true', editedBy: user.email, editedAt: now, updatedAt: now }).where(eq(table.id, id));
  revalidatePath('/', 'layout');
}

const checked = (form: FormData, name: string) => form.getAll(name).map(String);

const quickEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(600),
  description: z.string().trim().max(6000),
  printLine: z.string().trim().max(200),
  eventTypes: z.array(z.enum(EVENT_TYPES as [string, ...string[]])),
});

/**
 * Staff's quick fixes from the event's own page: its title, card sentence,
 * copy and kinds. Whatever they change is locked, so the next import keeps
 * their answer rather than the source's.
 */
export async function quickEditEvent(form: FormData) {
  const user = await requireStaff();
  const v = quickEventSchema.parse({ ...Object.fromEntries(form), eventTypes: checked(form, 'eventTypes') });
  const [row] = await db.select().from(events).where(eq(events.id, v.id));
  if (!row) return;
  const next = { title: v.title, summary: v.summary || null, description: v.description || null, printLine: v.printLine || null, eventTypes: v.eventTypes };
  const changed = (Object.keys(next) as (keyof typeof next)[]).filter((k) => JSON.stringify(row[k]) !== JSON.stringify(next[k]));
  if (!changed.length) return;
  const now = new Date();
  await db
    .update(events)
    .set({
      ...next,
      // A guide line cleared is Claude's to write again; any other change stays as set.
      ...(next.printLine ? {} : { printLineKey: null }),
      lockedFields: [...new Set([...row.lockedFields, ...changed])].filter((f) => f !== 'printLine' || next.printLine),
      editedBy: user.email,
      editedAt: now,
      updatedAt: now,
    })
    .where(eq(events.id, v.id));
  revalidatePath('/', 'layout');
}

const quickTourSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(600),
  description: z.string().trim().max(6000),
  genre: z.union([z.enum(GENRES), z.literal('')]),
});

/** The same for a tour, its genre in place of an event's kinds. */
export async function quickEditTour(form: FormData) {
  const user = await requireStaff();
  const v = quickTourSchema.parse(Object.fromEntries(form));
  const [row] = await db.select().from(experiences).where(eq(experiences.id, v.id));
  if (!row) return;
  const next = { title: v.title, summary: v.summary || null, description: v.description || null, genre: v.genre || null };
  const changed = (Object.keys(next) as (keyof typeof next)[]).filter((k) => row[k] !== next[k]);
  if (!changed.length) return;
  const now = new Date();
  await db
    .update(experiences)
    .set({ ...next, lockedFields: [...new Set([...row.lockedFields, ...changed])], editedBy: user.email, editedAt: now, updatedAt: now })
    .where(eq(experiences.id, v.id));
  revalidatePath('/', 'layout');
}

const imageSchema = z.object({
  kind: z.enum(['event', 'experience']),
  id: z.string().uuid(),
  mode: z.enum(['upload', 'url', 'remove']),
  url: z.string().trim().max(1000).optional(),
  alt: z.string().trim().max(300).optional(),
});

/**
 * A listing's picture, set by a person: uploaded, linked from elsewhere,
 * or taken away. Locked, so neither the source nor the stock pictures
 * replace it. Says what went wrong rather than failing quietly.
 */
export async function setListingImage(form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireStaff();
  const v = imageSchema.parse({ kind: form.get('kind'), id: form.get('id'), mode: form.get('mode'), url: form.get('url') ?? undefined, alt: form.get('alt') ?? undefined });
  const table = v.kind === 'event' ? events : experiences;
  let headerImage: Image | null = null;
  try {
    if (v.mode === 'upload') {
      const file = form.get('file');
      if (!(file instanceof File) || !file.size) return { ok: false, error: 'Choose a picture first.' };
      headerImage = { url: await storeListingImage(v.kind, v.id, file), publicId: null, alt: v.alt || null, originalFilename: file.name || null };
    } else if (v.mode === 'url') {
      if (!v.url || !/^https:\/\/\S+$/i.test(v.url)) return { ok: false, error: 'A link starting https://, please.' };
      headerImage = { url: v.url, publicId: null, alt: v.alt || null, originalFilename: null };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await lockAndSet(table, v.id, 'headerImage', { headerImage }, user.email);
  revalidatePath('/', 'layout');
  return { ok: true };
}

const fallbackSchema = z.object({
  kind: z.enum(['organiser', 'venue']),
  /** The organiser's name, or the venue's id. */
  id: z.string().trim().min(1).max(300),
  mode: z.enum(['upload', 'url', 'remove']),
  url: z.string().trim().max(1000).optional(),
  alt: z.string().trim().max(300).optional(),
});

/**
 * An organiser's or venue's fallback picture: uploaded, linked or taken
 * away. Their events without a picture of their own follow at once.
 */
export async function setFallbackImage(form: FormData): Promise<{ ok: true; changed: number } | { ok: false; error: string }> {
  const user = await requireStaff();
  const v = fallbackSchema.parse({ kind: form.get('kind'), id: form.get('id'), mode: form.get('mode'), url: form.get('url') ?? undefined, alt: form.get('alt') ?? undefined });
  if (v.kind === 'venue' && !z.string().uuid().safeParse(v.id).success) return { ok: false, error: 'No such venue.' };
  const key = v.kind === 'organiser' ? organiserKey(v.id) : v.id;
  if (!key) return { ok: false, error: 'No such organiser.' };
  let image: Image | null = null;
  try {
    if (v.mode === 'upload') {
      const file = form.get('file');
      if (!(file instanceof File) || !file.size) return { ok: false, error: 'Choose a picture first.' };
      image = { url: await storeListingImage(`fallback-${v.kind}`, v.kind === 'organiser' ? key : v.id, file), publicId: null, alt: v.alt || null, originalFilename: file.name || null };
    } else if (v.mode === 'url') {
      if (!v.url || !/^https:\/\/\S+$/i.test(v.url)) return { ok: false, error: 'A link starting https://, please.' };
      // A link is kept as it is here; applyFallbacks copies it into our storage below, or next time if the site will not give it up now.
      image = { url: v.url, publicId: null, alt: v.alt || null, originalFilename: null };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const now = new Date();
  if (v.kind === 'organiser') {
    await db
      .insert(organiserProfiles)
      .values({ key, name: v.id, fallbackImage: image, editedBy: user.email, updatedAt: now })
      .onConflictDoUpdate({ target: organiserProfiles.key, set: { name: v.id, fallbackImage: image, editedBy: user.email, updatedAt: now } });
  } else {
    await db.update(places).set({ fallbackImage: image, editedBy: user.email, editedAt: now, updatedAt: now }).where(eq(places.id, v.id));
  }
  const changed = await applyFallbacks();
  revalidatePath('/', 'layout');
  return { ok: true, changed };
}

const takeOffSchema = z.object({ kind: z.enum(['event', 'experience']), id: z.string().uuid() });

/**
 * From a listing's own page: off the site and out of the guide, then on to
 * its admin page, where it shows as left out and can be put back. Staying
 * on the public page would only find it gone.
 */
export async function takeOffSite(form: FormData) {
  const user = await requireStaff();
  const { kind, id } = takeOffSchema.parse(Object.fromEntries(form));
  const table = kind === 'event' ? events : experiences;
  const now = new Date();
  const [row] = await db
    .update(table)
    .set({ inclusion: 'excluded', inclusionSetBy: user.email, inclusionSetAt: now, updatedAt: now })
    .where(eq(table.id, id))
    .returning({ slug: table.slug });
  revalidatePath('/', 'layout');
  redirect(row ? `/admin/${kind === 'event' ? 'whats-on' : 'tours'}/${row.slug}` : '/admin');
}

const includeAllSchema = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), what: z.enum(['events', 'tours']) });

/**
 * The draft becomes the selection: every event (or tour) the draft prints
 * for these dates that nobody has decided on yet is included, in one go.
 * Anything left out stays left out; staff take out what they do not want.
 */
export async function includeDraft(form: FormData) {
  const user = await requireStaff();
  const { from, to, what } = includeAllSchema.parse(Object.fromEntries(form));
  const window = { from, to };
  const now = new Date();
  const set = { inclusion: 'included' as const, inclusionSetBy: user.email, inclusionSetAt: now, updatedAt: now };
  if (what === 'events') {
    const { events: rows } = await guideSelection({ draft: true });
    const ids = rows.filter((r) => r.event.inclusion === 'candidate' && guideEvent(r.event, r.venue, window)).map((r) => r.event.id);
    if (ids.length) await db.update(events).set(set).where(inArray(events.id, ids));
  } else {
    const rows = await includedExperiences({ draft: true });
    const ids = rows.filter((r) => r.experience.inclusion === 'candidate' && guideTour(r.experience, r.provider, window)).map((r) => r.experience.id);
    if (ids.length) await db.update(experiences).set(set).where(inArray(experiences.id, ids));
  }
  revalidatePath('/admin/guide');
}
