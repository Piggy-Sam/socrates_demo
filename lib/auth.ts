import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { profiles, type Profile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEMO_COOKIE, DEMO_USER_ID } from "@/lib/demo";

/**
 * The authenticated Supabase user, or null.
 *
 * Wrapped in React `cache()` so the Supabase `getUser()` round-trip runs at most
 * ONCE per request even though the app layout AND each page both call
 * requireProfile() during the same render. Without this, every navigation paid
 * for two serialized auth round-trips. (The proxy's own getUser() in
 * lib/supabase/middleware.ts is a separate execution context and is not deduped
 * by this — that's an unavoidable single extra check per request.)
 *
 * NOTE: this is the REAL session only — it is null in a demo session. Resolve the
 * acting identity via getAuthIdentity() (reads) and gate writes on `isDemo`.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** True when the request carries the transient demo cookie. Read-only
 *  impersonation of the seeded demo account — every write path must no-op. */
export const isDemoRequest = cache(async (): Promise<boolean> => {
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === "1";
});

export type AuthIdentity = { userId: string; isDemo: boolean };

/**
 * The acting identity for this request: the real Supabase user if signed in, or
 * — if not, and the demo cookie is present — the demo account (read-only). A
 * real session always takes precedence over the demo cookie. Returns null when
 * neither is present.
 *
 * Writes MUST check `isDemo` and no-op; this is the single source of truth for
 * "who am I acting as" across pages, server actions, and route handlers.
 */
export const getAuthIdentity = cache(
  async (): Promise<AuthIdentity | null> => {
    const user = await getCurrentUser();
    if (user) return { userId: user.id, isDemo: false };
    if (await isDemoRequest()) return { userId: DEMO_USER_ID, isDemo: true };
    return null;
  },
);

/** Require an acting identity — redirects to /login if absent. Returns the
 *  user id and whether this is a (read-only) demo session. */
export async function requireUser(): Promise<{ id: string; isDemo: boolean }> {
  const id = await getAuthIdentity();
  if (!id) redirect("/login");
  return { id: id.userId, isDemo: id.isDemo };
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

/** Require an acting identity and a completed profile; otherwise redirect.
 *  In a demo session this resolves the seeded demo account (always onboarded). */
export async function requireProfile(): Promise<{
  userId: string;
  profile: Profile;
  isDemo: boolean;
}> {
  const id = await getAuthIdentity();
  if (!id) redirect("/login");
  const profile = await getProfile(id.userId);
  if (!profile || !profile.displayName) {
    // The demo account is always fully onboarded; if it somehow isn't, fall back
    // to the landing page rather than walk a visitor through onboarding.
    if (id.isDemo) redirect("/");
    redirect("/onboarding");
  }
  return { userId: id.userId, profile, isDemo: id.isDemo };
}
