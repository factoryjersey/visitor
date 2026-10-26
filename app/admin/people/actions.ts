'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createInvite } from '@/lib/auth/accounts';
import { canInvite } from '@/lib/auth/roles';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { LISTING_KINDS, ROLES, businesses } from '@/lib/db/schema';
import { TABLES } from '@/lib/listings';

type InviteState = { error?: string; link?: string; email?: string; emailed?: boolean } | null;

const inviteSchema = z.object({
  email: z.string().trim().email('Enter an email address.'),
  name: z.string().trim().max(120),
  role: z.enum(ROLES),
  /** An existing business, or "new" with newBusiness as its name. */
  businessId: z.string().optional(),
  newBusiness: z.string().trim().max(200).optional(),
});

/**
 * Invite staff (superadmin only) or a provider, to an existing business
 * or a new one made here. canInvite has the last word on who may make what.
 */
export async function inviteAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const user = await requireStaff();
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const { email, name, role, newBusiness } = parsed.data;

  let businessId: string | null = null;
  if (role === 'provider') {
    if (parsed.data.businessId === 'new') {
      if (!newBusiness) return { error: 'Name the new business.' };
      businessId = 'pending';
    } else if (parsed.data.businessId && z.string().uuid().safeParse(parsed.data.businessId).success) {
      businessId = parsed.data.businessId;
    } else {
      return { error: 'Choose the business they work for.' };
    }
  }
  if (!canInvite(user, { role, businessId })) return { error: role === 'provider' ? 'Not allowed.' : 'Only a superadmin can make staff.' };

  if (businessId === 'pending') {
    const [made] = await db.insert(businesses).values({ name: newBusiness! }).returning();
    businessId = made!.id;
  }
  const result = await createInvite({ email, name, role, businessId, invitedBy: user.email });
  revalidatePath('/admin/people');
  return result.ok ? { link: result.link, email: result.email, emailed: result.emailed } : { error: result.error };
}

/** Who looks after a listing. Their people can then edit it, through review. Blank: nobody. */
export async function setListingBusiness(form: FormData) {
  await requireStaff();
  const { kind, id, businessId } = z
    .object({ kind: z.enum(LISTING_KINDS), id: z.string().uuid(), businessId: z.union([z.string().uuid(), z.literal('')]) })
    .parse(Object.fromEntries(form));
  const table = TABLES[kind];
  await db.update(table).set({ businessId: businessId || null, updatedAt: new Date() } as never).where(eq(table.id, id));
  revalidatePath('/', 'layout');
}

/** Correct a business's name or contact details. */
export async function saveBusinessAction(form: FormData) {
  await requireStaff();
  const v = z
    .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(200), email: z.string().trim().max(200), phone: z.string().trim().max(40), website: z.string().trim().max(300) })
    .parse(Object.fromEntries(form));
  await db
    .update(businesses)
    .set({ name: v.name, email: v.email || null, phone: v.phone || null, website: v.website || null, updatedAt: new Date() })
    .where(eq(businesses.id, v.id));
  revalidatePath('/admin/people');
}
