import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { isEmailDomainAllowed } from './permissions';
import { getSupabaseServer } from './supabase-server';

export type SessionUser = { id: string; email: string };

/** The signed-in user, or null. An address outside the allowlist counts as not signed in. */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isEmailDomainAllowed(user.email, env.ALLOWED_EMAIL_DOMAINS)) return null;
  return { id: user.id, email: user.email.toLowerCase() };
}

/**
 * For Server Actions. Middleware already gates every page, but an action
 * is a POST that can be replayed from anywhere, so it checks for itself.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
