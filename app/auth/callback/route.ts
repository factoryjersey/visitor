import { NextResponse, type NextRequest } from 'next/server';
import { isEmailDomainAllowed, safeNext } from '@/lib/auth/permissions';
import { getSupabaseServer } from '@/lib/auth/supabase-server';
import { env } from '@/lib/env';

/**
 * Supabase OAuth callback: exchange the code, then refuse the session if
 * the account is outside the allowed domains — Supabase cannot filter
 * before Google signs somebody in.
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

  if (!isEmailDomainAllowed(data.user.email, env.ALLOWED_EMAIL_DOMAINS)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${base}/login?error=domain`);
  }

  return NextResponse.redirect(`${base}${safeNext(searchParams.get('next'))}`);
}
