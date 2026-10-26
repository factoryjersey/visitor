'use server';

import { z } from 'zod';
import { LISTING_KINDS } from '@/lib/db/schema';
import { submitClaim } from '@/lib/claims';

export type ClaimState = { ok: true } | { ok: false; errors: Record<string, string>; message?: string; values: Record<string, string> } | null;

const text = (max: number) => z.string().trim().max(max).transform((s) => s || null);

const schema = z.object({
  kind: z.union([z.enum(LISTING_KINDS), z.literal('')]).transform((s) => s || null),
  listingId: z.union([z.string().uuid(), z.literal('')]).transform((s) => s || null),
  name: z.string().trim().min(1, 'Your name, please').max(120),
  email: z.string().trim().email('An email address we can reach you on').max(200),
  phone: text(40),
  businessName: z.string().trim().min(1, 'The business, venue or organiser').max(200),
  relationship: text(80),
  message: text(2000),
});

/** Seconds a person takes at least; a form sent faster was not filled in by one. */
const MIN_SECONDS = 3;

export async function submitClaimAction(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const raw = Object.fromEntries(form);
  const values = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>;

  // A field people never see, and a clock: what fills the first or beats the second is not a person.
  const started = Number(values.started);
  if (values.website_url || !started || Date.now() - started < MIN_SECONDS * 1000) return { ok: true };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors, values };
  }
  if (!parsed.data.kind !== !parsed.data.listingId) return { ok: false, errors: {}, message: 'Something went wrong with that listing. Start again from its page.', values };

  const result = await submitClaim(parsed.data);
  return result.ok ? { ok: true } : { ok: false, errors: {}, message: result.error, values };
}
