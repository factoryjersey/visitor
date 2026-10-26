'use client';

import { useActionState } from 'react';
import { CopyLink } from './invite-link';

type State = { error?: string; link?: string; email?: string; emailed?: boolean } | null;

/** Name and email, and the link to pass on once made. Extra fields (role, business) come in as children. */
export function InviteForm({ action, children, submitLabel = 'Make invite link' }: { action: (s: State, f: FormData) => Promise<State>; children?: React.ReactNode; submitLabel?: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, null);
  return (
    <div className="space-y-3">
      <form key={state?.link ?? 'form'} action={formAction} className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Email</span>
          <input name="email" type="email" required className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Name</span>
          <input name="name" type="text" className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
        </label>
        {children}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? 'Making…' : submitLabel}</button>
          {state?.error && <span className="text-sm text-red-700">{state.error}</span>}
        </div>
      </form>
      {state?.link && (
        <div className="max-w-2xl rounded border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-sm text-emerald-800">Invite made for {state.email}.</p>
          <CopyLink link={state.link} emailedTo={state.emailed ? state.email : null} />
        </div>
      )}
    </div>
  );
}
