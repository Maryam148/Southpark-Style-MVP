import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — uses the SERVICE_ROLE key to bypass RLS.
 * Only use in server-side code (API routes, webhooks).
 * Cached in module scope since it's stateless and safe to reuse.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  cached = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
