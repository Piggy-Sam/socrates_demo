// Weekly recap RE-synthesis. POST, authenticated. Re-runs the recap over a
// SPECIFIC week (the one currently in view), overwriting that week's reflection
// rather than appending a new "latest week" row.
//
// Body: { periodStart, periodEnd } (ISO). Gathers the user's entries within
// that period, runs the SAME LLM generation as /api/recap/generate (shared via
// lib/recap/generate.ts), DELETES the existing weekly `summaries` row(s) for
// that exact period for this user, inserts the fresh one, returns { ok, content }.

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { summaries } from "@/lib/db/schema";
import { generateRecap } from "@/lib/recap/generate";

export const runtime = "nodejs";

/** Parse an ISO string into a valid Date, or null. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, {
      status: 401,
    });
  }

  let body: { periodStart?: unknown; periodEnd?: unknown };
  try {
    body = (await req.json()) as { periodStart?: unknown; periodEnd?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request." },
      { status: 400 },
    );
  }

  const start = parseDate(body.periodStart);
  const end = parseDate(body.periodEnd);
  if (!start || !end || start.getTime() >= end.getTime()) {
    return NextResponse.json(
      { ok: false, error: "Which week? That period didn't read clearly." },
      { status: 400 },
    );
  }

  const result = await generateRecap(user.id, start, end);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  // Replace, don't duplicate: drop the existing weekly row(s) for this exact
  // period, then insert the fresh reflection. Both inside one best-effort guard
  // so a persistence hiccup still hands the recap back to the reader.
  try {
    await db
      .delete(summaries)
      .where(
        and(
          eq(summaries.userId, user.id),
          eq(summaries.kind, "weekly"),
          eq(summaries.periodStart, start),
          eq(summaries.periodEnd, end),
        ),
      );
    await db.insert(summaries).values({
      userId: user.id,
      kind: "weekly",
      periodStart: start,
      periodEnd: end,
      content: result.content,
    });
  } catch (err) {
    console.error("[recap/regenerate] replace failed", err);
  }

  return NextResponse.json({ ok: true, content: result.content });
}
