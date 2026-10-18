import { z } from 'zod';

/**
 * Validates environment variables at startup.
 * Import this from anywhere that needs env vars; never use process.env directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),

  // Supabase Auth: visitor's own project. It proves who somebody is;
  // the users table decides whether they get in.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Server only. Accepting an invite with a password creates the
  // Supabase account with it; Google sign-in needs nothing.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // The canonical public URL. Redirects are built from this, never from
  // the request, which behind Railway's proxy says localhost.
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Comma-separated addresses that become superadmin on first sign-in,
  // so the first account needs no invite. Everyone else is invited.
  SUPERADMIN_EMAILS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
