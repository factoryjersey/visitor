'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { subscribe, unsubscribe } from '@/lib/subscribers';

export type SubscribeState = { ok: true } | { ok: false; error: string; email: string } | null;

const schema = z.object({
  email: z.string().trim().email('That does not look like an email address').max(200),
  source: z.enum(['popover', 'page', 'footer']).catch('page'),
});

/** Seconds a person takes at least; a form sent faster was not filled in by one. */
const MIN_SECONDS = 2;

export async function subscribeAction(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  const email = String(form.get('email') ?? '');
  // A field people never see, and a clock: what fills the first or beats the second is not a person.
  const started = Number(form.get('started'));
  if (form.get('website_url') || !started || Date.now() - started < MIN_SECONDS * 1000) return { ok: true };

  const parsed = schema.safeParse({ email, source: form.get('source') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your email address', email };
  const result = await subscribe(parsed.data.email, parsed.data.source);
  return result.ok ? { ok: true } : { ok: false, error: result.error, email };
}

/** The button on the leave page; the page then says it is done. */
export async function leaveAction(form: FormData): Promise<void> {
  const token = String(form.get('token') ?? '');
  await unsubscribe(token);
  redirect(`/subscribe/leave/${encodeURIComponent(token)}`);
}
