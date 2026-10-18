/**
 * Make somebody staff or superadmin from the command line, with a
 * password, or reset theirs. For the first account, when nobody can sign
 * in to invite anybody (SUPERADMIN_EMAILS does the same for Google
 * sign-in). Providers are invited from the admin, with a business.
 *
 *   pnpm auth:create-user --email=ben@factory.je --password='...' [--role=staff]
 *
 * Idempotent: an existing Supabase account just gets the new password,
 * and an existing account here keeps its role.
 */
import '@/lib/load-env';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { client, db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { env } from '@/lib/env';

const { values } = parseArgs({ options: { email: { type: 'string' }, password: { type: 'string' }, role: { type: 'string' } } });
const email = values.email?.trim().toLowerCase();
const password = values.password;
const role = values.role ?? 'superadmin';

if (!email || !password) {
  console.error("Usage: pnpm auth:create-user --email=X --password='Y' [--role=superadmin|staff]");
  process.exit(1);
}
if (role !== 'superadmin' && role !== 'staff') {
  console.error('--role is superadmin or staff. Invite providers from the admin, with their business.');
  process.exit(1);
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
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
  console.log(`${email}: created in Supabase`);
}

const [made] = await db.insert(users).values({ email, role, invitedBy: 'auth:create-user' }).onConflictDoNothing().returning();
console.log(made ? `${email}: ${role} account made` : `${email}: account already here, role unchanged`);
await client.end();
