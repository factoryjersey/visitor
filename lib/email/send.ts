import { env } from '@/lib/env';

/**
 * One email through Resend. Never throws and never holds up what sent it:
 * without a key, or if Resend says no, it returns false and whoever called
 * carries on (an invite link is still shown to copy).
 */
export type Email = { to: string | string[]; subject: string; text: string; html: string; replyTo?: string };

export const emailEnabled = () => Boolean(env.RESEND_API_KEY);

export async function sendEmail(email: Email): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const to = [email.to].flat().filter(Boolean);
  if (!to.length) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject: email.subject, text: email.text, html: email.html, reply_to: email.replyTo }),
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
