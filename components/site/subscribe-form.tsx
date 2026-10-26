'use client';

import { useActionState, useState } from 'react';
import { subscribeAction, type SubscribeState } from '@/app/(site)/subscribe/actions';

/**
 * An email address and a button, for the weekly email: the same form in
 * the front page's popover, on /subscribe and at the foot of every page.
 */
export function SubscribeForm({ source, autoFocus }: { source: 'popover' | 'page' | 'footer'; autoFocus?: boolean }) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeAction, null);
  const [started] = useState(() => String(Date.now()));
  if (state?.ok) {
    return (
      <div role="status" className="text-harbour">
        <p className="font-display text-lg font-semibold">Check your inbox</p>
        <p className="mt-1 text-sm leading-relaxed text-harbour/75">
          We have sent you a link to confirm. Once you follow it, the week’s What’s On comes every Thursday morning.
        </p>
      </div>
    );
  }

  const error = state && !state.ok ? state.error : null;
  return (
    <form action={action} className="relative" noValidate>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="started" value={started} />
      {/* Left empty by people, who never see it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label htmlFor={`subscribe-email-${source}`} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`subscribe-email-${source}`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus={autoFocus}
          defaultValue={state && !state.ok ? state.email : undefined}
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `subscribe-error-${source}` : undefined}
          className="min-w-0 flex-1 rounded-md border border-harbour/20 bg-white px-3 py-2.5 text-base text-ink outline-none transition focus:border-sea focus:ring-2 focus:ring-sea/20 sm:text-sm"
        />
        <button type="submit" disabled={pending} className="shrink-0 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-harbour disabled:opacity-60">
          {pending ? 'Signing up…' : 'Sign me up'}
        </button>
      </div>
      {error && (
        <p id={`subscribe-error-${source}`} className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-harbour/50">One email a week. Leave whenever you like, with the link in every one.</p>
    </form>
  );
}
