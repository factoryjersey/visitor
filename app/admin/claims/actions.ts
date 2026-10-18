'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { approveClaim, rejectClaim } from '@/lib/claims';

export type DecisionState = { done: 'approved'; businessName: string; listings: number; invite: { email: string; link: string } | null } | { done: 'rejected' } | { error: string } | null;

/** Approve: to the business chosen, or a new one named after the claim ("new"). Reject: with a note for our records. */
export async function decideClaimAction(_prev: DecisionState, form: FormData): Promise<DecisionState> {
  const user = await requireStaff();
  const v = z
    .object({
      claimId: z.string().uuid(),
      decision: z.enum(['approve', 'reject']),
      businessId: z.union([z.string().uuid(), z.literal('new'), z.literal('')]).optional(),
      withVenueEvents: z.string().optional(),
      note: z.string().trim().max(500).optional(),
    })
    .parse(Object.fromEntries(form));

  if (v.decision === 'reject') {
    await rejectClaim(v.claimId, user.email, v.note || null);
    revalidatePath('/admin', 'layout');
    return { done: 'rejected' };
  }
  const result = await approveClaim({
    claimId: v.claimId,
    reviewer: user.email,
    businessId: v.businessId && v.businessId !== 'new' ? v.businessId : null,
    withVenueEvents: v.withVenueEvents === 'on',
  });
  revalidatePath('/admin', 'layout');
  if (!result.ok) return { error: result.error };
  return { done: 'approved', businessName: result.businessName, listings: result.listings, invite: result.invite };
}
