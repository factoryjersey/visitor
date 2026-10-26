import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** The service-role client, for creating accounts. Server only; null when the key is not set. */
export function getSupabaseAdmin() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
