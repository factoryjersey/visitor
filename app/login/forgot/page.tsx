'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction } from '../actions';

type State = { error?: string; sent?: boolean } | null;

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(forgotPasswordAction, null);
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-stone-50 px-4">
      <div className="rounded border border-stone-200 bg-white p-8">
        <h1 className="mb-1 font-serif text-2xl">Forgotten password</h1>
        {state?.sent ? (
          <p className="text-sm text-stone-600">
            If there is an account for that address, we have emailed it a link to set a new password. Open the link in this browser.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-stone-600">We will email you a link to set a new one.</p>
            <form action={formAction} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-600">Email</span>
                <input name="email" type="email" required autoComplete="email" className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
              </label>
              {state?.error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
              <button type="submit" disabled={pending} className="w-full rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {pending ? 'Sending…' : 'Send link'}
              </button>
            </form>
          </>
        )}
        <p className="mt-4 text-center text-sm"><Link href="/login" className="text-stone-500 hover:text-stone-900 hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
