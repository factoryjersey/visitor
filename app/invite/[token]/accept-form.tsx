'use client';

import { useActionState } from 'react';
import { acceptInviteAction } from './actions';

type State = { error?: string } | null;

export function AcceptForm({ token, name }: { token: string; name: string | null }) {
  const [state, formAction, pending] = useActionState<State, FormData>(acceptInviteAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" name="name" type="text" defaultValue={name ?? ''} autoComplete="name" />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      <Field label="Password again" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      {state?.error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Setting up…' : 'Set password and sign in'}
      </button>
    </form>
  );
}

function Field({ label, ...input }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">{label}</span>
      <input {...input} className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
    </label>
  );
}
