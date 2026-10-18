import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Role } from '@/lib/db/schema';
import { resolveAccount } from './accounts';
import { isStaff } from './roles';
import { getSupabaseServer } from './supabase-server';

export type SessionUser = { id: string; email: string; name: string | null; role: Role; businessId: string | null };

/** The signed-in user, or null. Somebody Supabase knows but we have no account for counts as not signed in. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const account = await resolveAccount(user);
  if (!account) return null;
  return { id: account.id, email: account.email, name: account.name, role: account.role, businessId: account.businessId };
});

/**
 * For Server Actions. Middleware already gates every page, but an action
 * is a POST that can be replayed from anywhere, so it checks for itself.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

/** The editing side. A provider who finds an /admin URL gets a 404, not a hint. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaff(user.role)) notFound();
  return user;
}

export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'superadmin') notFound();
  return user;
}

/** A provider with a business: everything under /account that touches listings. */
export async function requireProvider(): Promise<SessionUser & { businessId: string }> {
  const user = await requireUser();
  if (user.role !== 'provider' || !user.businessId) redirect('/admin');
  return user as SessionUser & { businessId: string };
}
