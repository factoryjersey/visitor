import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/auth/supabase-server';
import { env } from '@/lib/env';

/**
 * Sign out and clear every Supabase cookie on the redirect itself, since
 * middleware can re-set them before this handler runs.
 */
export async function POST() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/login`, { status: 303 });
  for (const c of (await cookies()).getAll()) {
    if (c.name.startsWith('sb-')) response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
  }
  return response;
}
