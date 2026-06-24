"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, DEMO_MAX_AGE_SECONDS } from "@/lib/demo";

// Pitch-deck fallback path (slide 8). Mirrors app/demo-actions.ts startDemo:
// set the transient demo cookie atomically, then drop the visitor straight into
// the live voice surface so a judge can talk to Socrates in the browser even if
// the phone-call path is unavailable. Using a server action (POST) means
// navigation prefetch can never trip the cookie.
export async function startDemoTalk() {
  const store = await cookies();
  store.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_MAX_AGE_SECONDS,
  });
  redirect("/talk");
}
