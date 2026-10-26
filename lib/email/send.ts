import { env } from '@/lib/env';

/**
 * One email through Resend. Never throws and never holds up what sent it:
 * without a key, or if Resend says no, it returns false and whoever called
 * carries on (an invite link is still shown to copy).
 */
export type Email = { to: string | string[]; subject: string; text: string; html: string; replyTo?: string; headers?: Record<string, string> };

export const emailEnabled = () => Boolean(env.RESEND_API_KEY);

const body = (email: Email, to: string[]) => ({ from: env.EMAIL_FROM, to, subject: email.subject, text: email.text, html: email.html, reply_to: email.replyTo, headers: email.headers });

export async function sendEmail(email: Email): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const to = [email.to].flat().filter(Boolean);
  if (!to.length) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body(email, to)),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`email "${email.subject}" to ${to.join(', ')} refused: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`email "${email.subject}" to ${to.join(', ')} failed: ${(e as Error).message}`);
    return false;
  }
}

/** Resend takes at most this many in one batch. */
export const BATCH_SIZE = 100;

/**
 * Up to a hundred emails in one request, each to its own reader (the
 * weekly email: one per subscriber, each with their own unsubscribe link).
 * Resend sends all of a batch or none of it, so this is true or false for
 * the lot.
 */
export async function sendBatch(emails: Email[]): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  if (emails.length === 0) return true;
  if (emails.length > BATCH_SIZE) throw new Error(`a batch is at most ${BATCH_SIZE} emails, not ${emails.length}`);
  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(emails.map((e) => body(e, [e.to].flat().filter(Boolean)))),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`batch of ${emails.length} "${emails[0]!.subject}" refused: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`batch of ${emails.length} "${emails[0]!.subject}" failed: ${(e as Error).message}`);
    return false;
  }
}
