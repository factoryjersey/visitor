'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/auth/session';
import { DO_SIDES, doActivities, places } from '@/lib/db/schema';

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Activity = z.object({
  name: z.string().trim().min(1).max(60),
  side: z.enum(DO_SIDES),
  blurb: z.string().trim().max(600),
  imageUrl: z.union([z.literal(''), z.string().trim().url()]),
  position: z.coerce.number().int().min(0).max(999),
});

function activityFrom(form: FormData) {
  return Activity.parse({
    name: form.get('name'),
    side: form.get('side'),
    blurb: form.get('blurb') ?? '',
    imageUrl: form.get('imageUrl') ?? '',
    position: form.get('position') || 0,
  });
}

/** An activity's name, side, piece, picture and place in the run, and whether this edition prints it. */
export async function saveActivity(form: FormData) {
  await requireStaff();
  const id = z.string().uuid().parse(form.get('id'));
  const a = activityFrom(form);
  await db
    .update(doActivities)
    .set({
      name: a.name,
      side: a.side,
      blurb: a.blurb || null,
      image: a.imageUrl ? { url: a.imageUrl, publicId: null, alt: a.name, originalFilename: null } : null,
      position: a.position,
      included: form.get('included') === 'on',
      updatedAt: new Date(),
    })
    .where(eq(doActivities.id, id));
  revalidatePath('/admin/do');
}

export async function addActivity(form: FormData) {
  await requireStaff();
  const a = activityFrom(form);
  await db
    .insert(doActivities)
    .values({ slug: slugOf(a.name), name: a.name, side: a.side, blurb: a.blurb || null, image: a.imageUrl ? { url: a.imageUrl, publicId: null, alt: a.name, originalFilename: null } : null, position: a.position })
    .onConflictDoNothing();
  revalidatePath('/admin/do');
}

/** A provider's marker in the index and the activities it offers. A provider without a marker is left out of the index. */
export async function saveDoProvider(form: FormData) {
  await requireStaff();
  const id = z.string().uuid().parse(form.get('id'));
  const code = z.string().trim().toUpperCase().max(6).parse(form.get('code') ?? '');
  const activities = form.getAll('activity').map(String).filter(Boolean);
  await db.update(places).set({ activityCode: code || null, activities, updatedAt: new Date() }).where(eq(places.id, id));
  revalidatePath('/admin/do');
}
