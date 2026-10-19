'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createInvite } from '@/lib/auth/accounts';
import { canManage } from '@/lib/auth/roles';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

/**
 * Changes to somebody else's account, for staff in the admin and for a
 * provider on their own team. Each checks canManage, so a provider can
 * only reach their own business's people and nobody can reach themselves.
 */

async function target(form: FormData) {
  const actor = await requireUser();
  const id = z.string().uuid().parse(form.get('userId'));
  const [other] = await db.select().from(users).where(eq(users.id, id));
  if (!other || !canManage(actor, other)) throw new Error('Not allowed');
  return { actor, other };
}

const refresh = () => {
  revalidatePath('/account/team');
  revalidatePath('/admin/users');
};

/** Stop somebody signing in. Their account, and what they did, stay. */
export async function disableUserAction(form: FormData) {
  const { other } = await target(form);
  await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, other.id));
  refresh();
}

export async function enableUserAction(form: FormData) {
  const { other } = await target(form);
  await db.update(users).set({ disabledAt: null }).where(eq(users.id, other.id));
  refresh();
}

type LinkState = { link?: string; email?: string; emailed?: boolean; error?: string } | null;

/** A fresh invite link for somebody who has not set a password yet, or lost the first one. */
export async function resendInviteAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  const { actor, other } = await target(form);
  const result = await createInvite({ email: other.email, role: other.role, businessId: other.businessId, invitedBy: actor.email });
  refresh();
  return result.ok ? { link: result.link, email: result.email, emailed: result.emailed } : { error: result.error };
}
