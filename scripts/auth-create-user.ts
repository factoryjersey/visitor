/**
 * Create a password sign-in for somebody, or reset theirs, through the
 * Supabase Auth admin API. Google sign-in needs nothing creating.
 *
 *   pnpm auth:create-user --email=ben@factory.je --password='...'
 *
 * Idempotent: an existing account just gets the new password. If the
 * Supabase project is shared with factoryOS, so is the account.
 */
import '@/lib/load-env';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { isEmailDomainAllowed } from '@/lib/auth/permissions';
import { env } from '@/lib/env';

const { values } = parseArgs({ options: { email: { type: 'string' }, password: { type: 'string' } } });
const email = values.email?.trim().toLowerCase();
const password = values.password;

if (!email || !password) {
  console.error("Usage: pnpm auth:create-user --email=X --password='Y'");
  process.exit(1);
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  process.exit(1);
}
if (!isEmailDomainAllowed(email, env.ALLOWED_EMAIL_DOMAINS)) {
  console.error(`${email} is outside ALLOWED_EMAIL_DOMAINS and could not sign in.`);
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
const existing = listed.users.find((u) => u.email?.toLowerCase() === email);

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
  if (error) throw error;
  console.log(`${email}: password updated`);
} else {
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  console.log(`${email}: created`);
}
