'use server';

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/auth/supabase-server';
import { isEmailDomainAllowed, safeNext } from '@/lib/auth/permissions';
import { env } from '@/lib/env';

// Cannot `export` non-function values from a 'use server' file. The page
// re-declares this type.
type SignInState = { error?: string } | null;

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? '/admin'));

  if (!email || !password) return { error: 'Email and password required' };

  // Before Supabase, so which accounts exist is not leaked by a different error.
  if (!isEmailDomainAllowed(email, env.ALLOWED_EMAIL_DOMAINS)) {
    const allowed = env.ALLOWED_EMAIL_DOMAINS ?? '';
    return {
      error: allowed
        ? `Sign-in is restricted to ${allowed.split(',').map((d) => '@' + d.trim()).join(', ')} addresses.`
        : 'Sign-in not permitted for this email address.',
    };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(next);
}

/**
 * Start Google sign-in. Google may sign in any account, so the domain is
 * checked in /auth/callback, after the fact.
 */
export async function signInWithGoogleAction(formData: FormData) {
  const next = safeNext(String(formData.get('next') ?? '/admin'));
  const supabase = await getSupabaseServer();
  // Pre-select the workspace account for people signed in to several.
  const hd = env.ALLOWED_EMAIL_DOMAINS?.split(',')[0]?.trim();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: hd ? { hd } : undefined,
    },
  });

  if (error || !data.url) redirect('/login?error=oauth_start');
  redirect(data.url);
}
