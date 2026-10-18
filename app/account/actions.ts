'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createInvite } from '@/lib/auth/accounts';
import { canInvite } from '@/lib/auth/roles';
import { requireProvider } from '@/lib/auth/session';
import { KIND_PATH } from '@/lib/account-paths';
import { LISTING_KINDS } from '@/lib/db/schema';
import { parseListingForm } from '@/lib/domain/listing-form';
import { createListing, updateListing } from '@/lib/listings';

export type SaveState =
  | { ok: true; at: number; message: string; values?: undefined }
  | { ok: false; at: number; errors: Record<string, string>; message?: string; values: Record<string, string> }
  | null;

const OUTCOME = {
  saved: 'Saved. It is with us for review.',
  submitted: 'Sent for review. The listing stays as it is until we approve the change.',
  unchanged: 'Nothing had changed.',
} as const;

/** Add or edit one of the business's listings. Which fields count is decided by parseListingForm, never the form. */
export async function saveListingAction(_prev: SaveState, form: FormData): Promise<SaveState> {
  const user = await requireProvider();
  const kind = z.enum(LISTING_KINDS).parse(form.get('kind'));
  const id = form.get('id');
  const raw = Object.fromEntries(form);
  const values = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  const at = Date.now();

  const parsed = parseListingForm(kind, raw);
  if (!parsed.ok) return { ok: false, at, errors: parsed.errors, values };

  const result =
    typeof id === 'string' && id
      ? await updateListing(kind, z.string().uuid().parse(id), parsed.values, user)
      : await createListing(kind, parsed.values, user);
  if (!result.ok) return { ok: false, at, errors: {}, message: result.error, values };

  revalidatePath('/account');
  if (result.outcome === 'created') redirect(`/account/${KIND_PATH[kind]}/${result.slug}?created=1`);
  return { ok: true, at, message: OUTCOME[result.outcome] };
}

type InviteState = { error?: string; link?: string; email?: string } | null;

/** Invite a colleague to the same business. The link is shown once, here, to pass on. */
export async function inviteColleagueAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const user = await requireProvider();
  const parsed = z.object({ email: z.string().trim().email(), name: z.string().trim().max(120) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Enter an email address.' };
  if (!canInvite(user, { role: 'provider', businessId: user.businessId })) return { error: 'Not allowed.' };
  const result = await createInvite({ ...parsed.data, role: 'provider', businessId: user.businessId, invitedBy: user.email });
  if (!result.ok) return { error: result.error };
  revalidatePath('/account/team');
  return { link: result.link, email: result.email };
}
