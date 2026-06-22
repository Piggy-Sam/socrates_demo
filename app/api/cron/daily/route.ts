// The scheduled daily call. GET, fired by Vercel Cron once a day (UTC) — see
// vercel.json. Vercel sends `Authorization: Bearer <CRON_SECRET>`; we verify it.
//
// Hobby cron is daily-only and fires anywhere within the hour, UTC. So this is
// intentionally lenient: for the demo it calls every profile that has a phone on
// file. (Per-timezone precision against daily_call_time is a Pro / external-
// scheduler concern; the "Call me now" button is the primary demo path.)

import { NextResponse } from "next/server";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, profiles } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { startOutboundCall } from "@/lib/elevenlabs/calls";

export const runtime = "nodejs";

/** A one-line continuity hook from the user's most recent entry. */
async function recentThread(userId: string): Promise<string> {
  try {
    const rows = await db
      .select({ content: entries.content })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.createdAt))
      .limit(1);
    const content = rows[0]?.content?.trim();
    if (!content) return "";
    return content.length > 220 ? `${content.slice(0, 217)}...` : content;
  } catch {
    return "";
  }
}

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret()}`;
  // constant-ish comparison; lengths usually differ only on a real mismatch
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, {
      status: 401,
    });
  }

  // every profile with a phone number is "due" for the demo
  const due = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      phoneE164: profiles.phoneE164,
    })
    .from(profiles)
    .where(isNotNull(profiles.phoneE164));

  const results: Array<{
    userId: string;
    ok: boolean;
    conversationId?: string | null;
    error?: string;
  }> = [];

  // sequential — guard each failure so one bad number doesn't abort the rest
  for (const p of due) {
    const toNumber = p.phoneE164?.trim();
    if (!toNumber) continue;
    try {
      const result = await startOutboundCall({
        toNumber,
        dynamicVariables: {
          user_id: p.id,
          display_name: p.displayName?.trim() || "there",
          recent_thread: await recentThread(p.id),
        },
      });
      results.push({
        userId: p.id,
        ok: result.success,
        conversationId: result.conversationId,
        error: result.success ? undefined : result.message ?? "call failed",
      });
    } catch (err) {
      console.error("[cron/daily] call failed for", p.id, err);
      results.push({
        userId: p.id,
        ok: false,
        error: err instanceof Error ? err.message : "call failed",
      });
    }
  }

  const placed = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    due: due.length,
    placed,
    failed: results.length - placed,
    results,
  });
}
