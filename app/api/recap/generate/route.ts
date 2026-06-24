// Weekly recap synthesis. POST, authenticated. Gathers the last 7 days of the
// user's entries and makes ONE OpenAI call to write a reflective recap in
// Socrates' restrained, non-appraising voice (see lib/recap/generate.ts).
//
// Persists a `summaries` row (kind = 'weekly', period = the week) and returns
// { ok, content }.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { summaries } from "@/lib/db/schema";
import { generateRecap, weekStart } from "@/lib/recap/generate";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, {
      status: 401,
    });
  }

  const now = new Date();
  const start = weekStart(now);

  const result = await generateRecap(user.id, start, now);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  try {
    await db.insert(summaries).values({
      userId: user.id,
      kind: "weekly",
      periodStart: start,
      periodEnd: now,
      content: result.content,
    });
  } catch (err) {
    // Persisting is best-effort; still hand the recap back to the user.
    console.error("[recap/generate] insert failed", err);
  }

  return NextResponse.json({ ok: true, content: result.content });
}
