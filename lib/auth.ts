import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { profiles, type Profile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * The authenticated user, or null.
 *
 * Wrapped in React `cache()` so the Supabase `getUser()` round-trip runs at most
 * ONCE per request even though the app layout AND each page both call
 * requireProfile() during the same render. Without this, every navigation paid
 * for two serialized auth round-trips. (The proxy's own getUser() in
 * lib/supabase/middleware.ts is a separate execution context and is not deduped
 * by this — that's an unavoidable single extra check per request.)
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Require auth — redirects to /login if absent. Returns the user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The user's profile row (or null if onboarding isn't complete). Cached per
 * request so layout + page don't each issue the same profile query. */
export const getProfile = cache(
  async (userId: string): Promise<Profile | null> => {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    return rows[0] ?? null;
  },
);

/** Require both auth and a completed profile; otherwise redirect. */
export async function requireProfile(): Promise<{
  userId: string;
  profile: Profile;
}> {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile || !profile.displayName) redirect("/onboarding");
  return { userId: user.id, profile };
}
