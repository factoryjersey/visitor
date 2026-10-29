'use server';

import { revalidatePath } from 'next/cache';
import { refreshSite } from '@/lib/refresh';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { LISTING_KINDS } from '@/lib/db/schema';
import { approveAllFrom, approveChange, rejectChange, reviewListing } from '@/lib/listings';

const note = (form: FormData) => String(form.get('note') ?? '').trim().slice(0, 500) || null;

/** Approve or turn down a provider's new listing. */
export async function reviewListingAction(form: FormData) {
  await requireStaff();
  const { kind, id, decision } = z
    .object({ kind: z.enum(LISTING_KINDS), id: z.string().uuid(), decision: z.enum(['approved', 'rejected']) })
    .parse(Object.fromEntries(form));
  await reviewListing(kind, id, decision, note(form));
  refreshSite();
}

/** Approve or turn down a provider's edit to a live listing. */
export async function reviewChangeAction(form: FormData) {
  const user = await requireStaff();
  const { id, decision } = z.object({ id: z.string().uuid(), decision: z.enum(['approved', 'rejected']) }).parse(Object.fromEntries(form));
  if (decision === 'approved') await approveChange(id, user.email);
  else await rejectChange(id, user.email, note(form));
  refreshSite();
}

/** Approve everything waiting from one imported source, once staff have looked down the list. */
export async function approveAllAction(form: FormData) {
  await requireStaff();
  const { kind, source } = z.object({ kind: z.enum(LISTING_KINDS), source: z.string().min(1).max(60) }).parse(Object.fromEntries(form));
  await approveAllFrom(kind, source);
  refreshSite();
}
