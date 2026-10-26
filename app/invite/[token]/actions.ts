'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { findInvite, recordSignIn, resolveAccount } from '@/lib/auth/accounts';
import { homeFor } from '@/lib/auth/roles';
import { getSupabaseAdmin } from '@/lib/auth/supabase-admin';
import { getSupabaseServer } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

type AcceptState = { error?: string } | null;

const acceptSchema = z.object({
  token: z.string().min(20),
  name: z.string().trim().max(120),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
  confirm: z.string(),
});

/**
 * Accept an invite with a password: make the Supabase account, confirmed,
 * since the link was sent to that address, then sign in with it. An
 * address Supabase already knows keeps its password — whoever holds an
 * invite link must not be able to change somebody's existing one.
 */
export async function acceptInviteAction(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const { token, name, password, confirm } = parsed.data;
  if (password !== confirm) return { error: 'The two passwords differ.' };

  const found = await findInvite(token);
  if (!found) return { error: 'This invite has been used or has expired. Ask for a new one.' };
  const { account } = found;

  const admin = getSupabaseAdmin();
  if (!admin) return { error: 'Passwords are not set up yet. Sign in with Google as this address instead.' };

  const { error: createError } = await admin.auth.admin.createUser({ email: account.email, password, email_confirm: true });
  if (createError) {
    if (/already/i.test(createError.message)) {
      return { error: 'This address already has a password. Sign in with it, or use "Forgotten your password?" on the sign-in page.' };
    }
    return { error: createError.message };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (error) return { error: error.message };
  const resolved = await resolveAccount(data.user);
  if (!resolved) return { error: 'Signed in, but the account is not active. Ask for a new invite.' };

  if (name) await db.update(users).set({ name }).where(eq(users.id, resolved.id));
  await recordSignIn(resolved);
  redirect(homeFor(resolved.role));
}
