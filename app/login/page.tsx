'use client';

import Link from 'next/link';
import { use, useActionState } from 'react';
import { signInAction, signInWithGoogleAction } from './actions';

type SignInState = { error?: string } | null;

const ERROR_MESSAGES: Record<string, string> = {
  oauth_missing_code: 'Google sign-in failed (no code returned). Try again.',
  oauth_exchange: "Couldn't complete Google sign-in. Try again.",
  oauth_start: "Couldn't start Google sign-in. Check your network and try again.",
  no_account: 'There is no account for that Google address. Use the address you were invited with, or ask for a new invite.',
};

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: nextParam, error: errorParam } = use(searchParams);
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, null);
  const next = nextParam ?? '';
  const oauthError = errorParam ? ERROR_MESSAGES[errorParam] ?? null : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-stone-50 px-4">
      <div className="rounded border border-stone-200 bg-white p-8">
        <h1 className="mb-1 font-display text-2xl">Sign in</h1>
        <p className="mb-6 text-sm text-stone-600">With Google, or the password you set from your invite.</p>

        {oauthError && <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{oauthError}</p>}

        <form action={signInWithGoogleAction}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-2 3.018v2.504h3.236c1.89-1.74 2.982-4.305 2.982-7.345Z"/>
              <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.428l-3.236-2.504c-.896.6-2.042.954-3.382.954-2.604 0-4.81-1.758-5.598-4.124H3.063v2.59A9.996 9.996 0 0 0 12 22Z"/>
              <path fill="#FBBC05" d="M6.402 13.898a5.998 5.998 0 0 1 0-3.796V7.512H3.063a10.003 10.003 0 0 0 0 8.976l3.339-2.59Z"/>
              <path fill="#EA4335" d="M12 5.98c1.469 0 2.787.504 3.823 1.494l2.868-2.868C16.96 2.99 14.695 2 12 2A9.996 9.996 0 0 0 3.063 7.512l3.339 2.59C7.19 7.737 9.396 5.98 12 5.98Z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />or with password<span className="h-px flex-1 bg-stone-200" />
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">Email</span>
            <input name="email" type="email" required autoComplete="email" className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">Password</span>
            <input name="password" type="password" required autoComplete="current-password" className="w-full rounded border border-stone-300 px-3 py-2 text-sm" />
          </label>
          {state?.error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <button type="submit" disabled={pending} className="w-full rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm"><Link href="/login/forgot" className="text-stone-500 hover:text-stone-900 hover:underline">Forgotten your password?</Link></p>
      </div>
    </div>
  );
}
