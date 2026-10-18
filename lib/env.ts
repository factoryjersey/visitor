import { z } from 'zod';

/**
 * Validates environment variables at startup.
 * Import this from anywhere that needs env vars; never use process.env directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),

  // Supabase Auth. Point these at factoryOS's project and the same
  // accounts sign in to both.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Only the create-user script needs it; the app never does.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // The canonical public URL. Redirects are built from this, never from
  // the request, which behind Railway's proxy says localhost.
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Comma-separated, e.g. "factory.je". Unset means no restriction —
  // fine locally, never in production.
  ALLOWED_EMAIL_DOMAINS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
