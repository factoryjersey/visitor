import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { User as AuthUser } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { invites, users, type Role, type User } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { isEmailListed } from './permissions';

/**
 * The account behind a Supabase identity, or null if it may not sign in.
 *
 * Matched on the Supabase id once known, and on the email before that —
 * an invite is made for an address, before anybody has signed in. An
 * email only counts once Supabase has confirmed it: an unconfirmed
 * sign-up with somebody else's address must not inherit their account.
 */
export async function resolveAccount(auth: Pick<AuthUser, 'id' | 'email' | 'email_confirmed_at'> | null): Promise<User | null> {
  if (!auth?.email || !auth.email_confirmed_at) return null;
  const email = auth.email.toLowerCase();

  const [byId] = await db.select().from(users).where(eq(users.authId, auth.id));
  const [byEmail] = byId ? [] : await db.select().from(users).where(and(eq(users.email, email), isNull(users.authId)));
  const found = byId ?? byEmail;

  if (found) {
    if (found.disabledAt) return null;
    if (found.authId) return found;
    const [linked] = await db.update(users).set({ authId: auth.id }).where(eq(users.id, found.id)).returning();
    return linked!;
  }

  // The first superadmin cannot be invited by anybody.
  if (isEmailListed(email, env.SUPERADMIN_EMAILS)) {
    const [created] = await db
      .insert(users)
      .values({ email, authId: auth.id, role: 'superadmin', invitedBy: 'SUPERADMIN_EMAILS' })
      .onConflictDoNothing()
      .returning();
    return created ?? null;
  }
  return null;
}

/** Note the sign-in, and close any open invite: however they got in, it has done its job. */
export async function recordSignIn(account: Pick<User, 'id' | 'email'>) {
  const now = new Date();
  await db.update(users).set({ lastSignInAt: now }).where(eq(users.id, account.id));
  await db.update(invites).set({ acceptedAt: now }).where(and(eq(invites.email, account.email), isNull(invites.acceptedAt)));
}

const INVITE_DAYS = 14;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const inviteLink = (token: string) => `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/invite/${token}`;

/**
 * Make an account for somebody and a link for them to set a password.
 * The account exists from now, so signing in with Google as that address
 * works without the link. Inviting the same person again replaces the
 * link; an address with an account as anything else is refused, so an
 * invite can never move somebody to another business or role.
 */
export async function createInvite(input: { email: string; role: Role; businessId: string | null; name?: string | null; invitedBy: string }): Promise<
  { ok: true; email: string; link: string } | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing && (existing.role !== input.role || existing.businessId !== input.businessId)) {
    return { ok: false, error: `${email} already has an account here.` };
  }
  if (existing?.disabledAt) return { ok: false, error: `${email} has been switched off. Switch it back on first.` };

  const token = randomBytes(32).toString('base64url');
  await db.transaction(async (tx) => {
    if (!existing) {
      await tx.insert(users).values({ email, role: input.role, businessId: input.businessId, name: input.name || null, invitedBy: input.invitedBy });
    }
    await tx.delete(invites).where(and(eq(invites.email, email), isNull(invites.acceptedAt)));
    await tx.insert(invites).values({
      email,
      role: input.role,
      businessId: input.businessId,
      tokenHash: hashToken(token),
      invitedBy: input.invitedBy,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
    });
  });
  return { ok: true, email, link: inviteLink(token) };
}

/** The open invite a link refers to, or null if it is unknown, used or expired. */
export async function findInvite(token: string) {
  const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, hashToken(token)));
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return null;
  const [account] = await db.select().from(users).where(eq(users.email, invite.email));
  if (!account || account.disabledAt) return null;
  return { invite, account };
}
