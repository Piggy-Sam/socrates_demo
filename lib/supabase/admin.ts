import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client (SECRET key) — bypasses RLS. Server-only. Use for the
 * post-call pipeline and admin tasks (e.g. looking up users due for a call).
 * NEVER import this into a client component.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
