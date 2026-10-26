import { randomBytes } from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscribers, type Subscriber } from '@/lib/db/schema';
import { emailEnabled, sendEmail } from '@/lib/email/send';
import { site, subscribeConfirmEmail } from '@/lib/email/templates';

/**
 * The weekly email's list. Double opt-in: signing up sends one email
 * asking the address's owner to confirm, and nothing more goes to it
 * until they do. Every email after that carries a link to leave, and a
 * one-click unsubscribe header for mail apps.
 */

/** Before this, asking again for the same address sends no second confirmation. */
const RESEND_AFTER_MINUTES = 10;
/** Confirmations in the last hour, all addresses, beyond which we stop: a bot feeding the form addresses. */
const CONFIRMATIONS_PER_HOUR = 200;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const newToken = () => randomBytes(24).toString('base64url');

export const confirmLink = (token: string) => `${site()}/subscribe/confirm/${token}`;
/** A page with a button: link checkers that open every link in an email must not unsubscribe anybody. */
export const leaveLink = (token: string) => `${site()}/subscribe/leave/${token}`;
/** RFC 8058 one-click unsubscribe, POSTed by the mail app itself. */
export const oneClickLink = (token: string) => `${site()}/api/unsubscribe?t=${token}`;

export type SubscribeResult = { ok: true } | { ok: false; error: string };

/**
 * Signs an address up, or asks again. Whether the address was already on
 * the list is never said: the answer is the same either way.
 */
export async function subscribe(rawEmail: string, source: string): Promise<SubscribeResult> {
  if (!emailEnabled()) return { ok: false, error: 'Sign-up is not open just now. Please try again later.' };
  const email = normaliseEmail(rawEmail);

  const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email));
  if (existing?.status === 'subscribed') return { ok: true };
  // The same address asking again while its confirmation is still fresh: that email will do.
  const recent = existing?.status === 'pending' && existing.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_AFTER_MINUTES * 60_000;
  if (recent) return { ok: true };

  const [{ n }] = (await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(gte(subscribers.confirmSentAt, sql`now() - interval '1 hour'`))) as [{ n: number }];
  if (n >= CONFIRMATIONS_PER_HOUR) {
    console.warn(`subscribe: ${n} confirmations in the last hour, not sending more`);
    return { ok: false, error: 'Lots of people are signing up just now. Please try again in an hour.' };
  }

  let row: Subscriber | undefined;
  if (existing) {
    [row] = await db.update(subscribers).set({ status: 'pending', confirmSentAt: new Date(), source }).where(eq(subscribers.id, existing.id)).returning();
  } else {
    [row] = await db.insert(subscribers).values({ email, token: newToken(), source, confirmSentAt: new Date() }).onConflictDoNothing().returning();
    // Two sign-ups for one address at once: the other one sent its email.
    if (!row) return { ok: true };
  }

  await sendEmail({ to: email, ...subscribeConfirmEmail({ link: confirmLink(row!.token) }) });
  return { ok: true };
}

/** From the link in the confirmation email. Only a pending address is confirmed: an old link does not undo leaving. */
export async function confirmSubscription(token: string): Promise<Subscriber['status'] | null> {
  if (!token) return null;
  const [done] = await db
    .update(subscribers)
    .set({ status: 'subscribed', confirmedAt: new Date() })
    .where(and(eq(subscribers.token, token), eq(subscribers.status, 'pending')))
    .returning({ status: subscribers.status });
  if (done) return done.status;
  const [row] = await db.select({ status: subscribers.status }).from(subscribers).where(eq(subscribers.token, token));
  return row?.status ?? null;
}

/** Leaves the list. The row stays, marked, so signing up again asks for confirmation again. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!token) return false;
  const [row] = await db
    .update(subscribers)
    .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
    .where(eq(subscribers.token, token))
    .returning({ id: subscribers.id });
  return Boolean(row);
}

export async function subscriberByToken(token: string) {
  if (!token) return null;
  const [row] = await db.select({ email: subscribers.email, status: subscribers.status }).from(subscribers).where(eq(subscribers.token, token));
  return row ?? null;
}
