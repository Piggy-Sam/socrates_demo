import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { profiles, type Profile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** The authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Require auth — redirects to /login if absent. Returns the user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The user's profile row (or null if onboarding isn't complete). */
export async function getProfile(userId: string): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

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
