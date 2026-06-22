import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client (SECRET key) — bypasses RLS. Server-only. Use for the
 * post-call pipeline and admin tasks (e.g. looking up users due for a call).
 * NEVER import this into a client component.
 *
 * Fails loud if SUPABASE_SECRET_KEY isn't actually a secret key: a publishable
 * value would silently downgrade this to an anon principal that DOESN'T bypass
 * RLS, so server writes would mis-behave under RLS instead of failing clearly.
 */
export function createAdminClient() {
  const key = env.supabaseSecretKey();
  if (!key.startsWith("sb_secret_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY must be a service `sb_secret_...` key (got a non-secret value). " +
        "Set the real secret key in .env.local and the Vercel project env.",
    );
  }
  return createClient(env.supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
