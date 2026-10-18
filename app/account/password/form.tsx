'use client';

import { useActionState } from 'react';
import { setPasswordAction } from './actions';

type State = { error?: string; done?: boolean } | null;

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(setPasswordAction, null);
  if (state?.done) return <p className="text-sm text-emerald-700">Password changed.</p>;
  return (
    <form action={formAction} className="max-w-sm space-y-4">
      {(['password', 'confirm'] as const).map((n) => (
        <label key={n} className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">{n === 'password' ? 'New password' : 'New password again'}</span>
          <input name={n} type="password" required minLength={10} autoComplete="new-password" className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
        </label>
      ))}
      {state?.error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  );
}
