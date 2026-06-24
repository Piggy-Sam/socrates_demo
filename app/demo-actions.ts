"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, DEMO_MAX_AGE_SECONDS } from "@/lib/demo";

// Server actions for the transient "See demo" session. Using actions (POST)
// rather than a GET link means navigation prefetch can never trip the cookie,
// and the cookie write + redirect happen atomically.

/** Enter the demo: set the cookie and drop the visitor into the populated app. */
export async function startDemo() {
  const store = await cookies();
  store.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_MAX_AGE_SECONDS,
  });
  redirect("/today");
}

/** Leave the demo: clear the cookie and return to the landing page. Nothing the
 *  visitor did was ever persisted, so there is nothing else to clean up. */
export async function exitDemo() {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  redirect("/");
}
