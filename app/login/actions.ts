'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { recordSignIn, resolveAccount } from '@/lib/auth/accounts';
import { safeNext } from '@/lib/auth/permissions';
import { homeFor } from '@/lib/auth/roles';
import { getSupabaseServer } from '@/lib/auth/supabase-server';
import { env } from '@/lib/env';

// Cannot `export` non-function values from a 'use server' file. The page
// re-declares this type.
type SignInState = { error?: string; sent?: boolean } | null;

const NO_ACCOUNT = 'There is no account for that address. Ask whoever invited you to send the invite again.';

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

/**
 * Where a sign-in by email link or Google was heading. Supabase drops the
 * return path when the address is not on its allow-list and sends people
 * to the Site URL instead; /auth/callback reads this when the path is gone.
 */
async function rememberNext(next: string) {
  (await cookies()).set('after_sign_in', safeNext(next), { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 30 });
}

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) return { error: 'Email and password required' };

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const account = await resolveAccount(data.user);
  if (!account) {
    await supabase.auth.signOut();
    return { error: NO_ACCOUNT };
  }
  await recordSignIn(account);
  redirect(next ? safeNext(next) : homeFor(account.role));
}

/** Start Google sign-in. Whether the address has an account is checked in /auth/callback. */
export async function signInWithGoogleAction(formData: FormData) {
  const next = String(formData.get('next') ?? '');
  if (next) await rememberNext(next);
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl()}/auth/callback${next ? `?next=${encodeURIComponent(safeNext(next))}` : ''}`,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data.url) redirect('/login?error=oauth_start');
  redirect(data.url);
}

/**
 * Email a link to set a new password. Says the same whether or not the
 * address has an account, so the form cannot be used to find out.
 */
export async function forgotPasswordAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'Email required' };
  await rememberNext('/account/password');
  const supabase = await getSupabaseServer();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl()}/auth/callback?next=/account/password` });
  return { sent: true };
}
