import { NextResponse, type NextRequest } from 'next/server';
import { recordSignIn, resolveAccount } from '@/lib/auth/accounts';
import { safeNext } from '@/lib/auth/permissions';
import { homeFor } from '@/lib/auth/roles';
import { getSupabaseServer } from '@/lib/auth/supabase-server';
import { env } from '@/lib/env';

/**
 * Supabase's return leg, for Google sign-in and for the password reset
 * email: exchange the code, then refuse the session unless the address
 * has an account here — Supabase will sign in any Google account.
 *
 * Redirects use NEXT_PUBLIC_APP_URL, never the request's origin, which
 * behind Railway's proxy is localhost.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  if (!code) return NextResponse.redirect(`${base}/login?error=oauth_missing_code`);

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return NextResponse.redirect(`${base}/login?error=oauth_exchange`);

  const account = await resolveAccount(data.user);
  if (!account) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${base}/login?error=no_account`);
  }
  await recordSignIn(account);

  const next = searchParams.get('next');
  return NextResponse.redirect(`${base}${next ? safeNext(next) : homeFor(account.role)}`);
}
