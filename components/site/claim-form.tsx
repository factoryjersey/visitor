'use client';

import { useActionState, useState } from 'react';
import { submitClaimAction, type ClaimState } from '@/app/(site)/claim/actions';
import type { ListingKind } from '@/lib/db/schema';

const input = 'mt-1 w-full rounded-md border border-harbour/20 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-sea focus:ring-2 focus:ring-sea/20';
const label = 'block text-xs font-semibold uppercase tracking-wide text-harbour/60';

/** Claim a listing (kind and id given), or ask to list something new (neither). */
export function ClaimForm({ kind, listingId, submitLabel }: { kind?: ListingKind; listingId?: string; submitLabel: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaimAction, null);
  const [started] = useState(() => String(Date.now()));

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-sea/5 p-6 ring-1 ring-sea/20">
        <h2 className="font-display text-xl font-semibold text-ink">Thank you</h2>
        <p className="mt-2 text-sm leading-relaxed text-harbour/80">
          We have your request and will check it, usually within two working days. When it is approved we will send you a link to set up your account, where you can update the details and add what you have coming up.
        </p>
      </div>
    );
  }

  const errors = state && !state.ok ? state.errors : {};
  const value = (k: string) => (state && !state.ok ? state.values[k] : undefined);
  const field = (name: string, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className={label}>{text}</span>
      <input name={name} defaultValue={value(name)} className={input} aria-invalid={errors[name] ? true : undefined} {...props} />
      {errors[name] && <span className="mt-1 block text-xs text-red-700">{errors[name]}</span>}
    </label>
  );

  return (
    <form action={action} className="relative grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind ?? ''} />
      <input type="hidden" name="listingId" value={listingId ?? ''} />
      <input type="hidden" name="started" value={started} />
      {/* Left empty by people, who never see it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website_url" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {field('name', 'Your name', { required: true, autoComplete: 'name' })}
      {field('email', 'Email', { required: true, type: 'email', autoComplete: 'email' })}
      {field('businessName', kind ? 'Business or organisation' : 'Business, venue or organiser', { required: true, autoComplete: 'organization' })}
      {field('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel' })}
      <label className="block sm:col-span-2">
        <span className={label}>{kind ? 'How you are connected to it' : 'What you run'}</span>
        <input name="relationship" defaultValue={value('relationship')} className={input} placeholder={kind ? 'Owner, manager, organiser…' : 'A café, a festival, guided walks…'} />
      </label>
      <label className="block sm:col-span-2">
        <span className={label}>Anything we should know (optional)</span>
        <textarea name="message" rows={4} defaultValue={value('message')} className={input} placeholder={kind ? 'A detail that is out of date, or how we can check you run it' : 'Your website, and what you would like to list'} />
      </label>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-harbour disabled:opacity-60">
          {pending ? 'Sending…' : submitLabel}
        </button>
        {state && !state.ok && <span className="text-sm text-red-700">{state.message ?? 'Check the fields marked.'}</span>}
      </div>
      <p className="text-xs text-harbour/50 sm:col-span-2">We use these details only to check your request and set up your account.</p>
    </form>
  );
}
