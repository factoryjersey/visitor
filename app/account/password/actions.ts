'use server';

import { requireUser } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/auth/supabase-server';

type State = { error?: string; done?: boolean } | null;

/** A new password for whoever is signed in: after the reset email, or just because. */
export async function setPasswordAction(_prev: State, formData: FormData): Promise<State> {
  await requireUser();
  const password = String(formData.get('password') ?? '');
  if (password.length < 10) return { error: 'Use at least 10 characters.' };
  if (password !== String(formData.get('confirm') ?? '')) return { error: 'The two passwords differ.' };
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { error: error.message } : { done: true };
}
