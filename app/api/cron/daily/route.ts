// The scheduled daily call. GET, fired by Vercel Cron (UTC) — see vercel.json.
// Vercel sends `Authorization: Bearer <CRON_SECRET>`; we verify it.
//
// Honest, respectful scheduling — migration-free (only existing columns):
//   • ON/OFF: dailyCallTime IS NULL means "daily calls off". We only consider
//     profiles that have BOTH a phone AND a non-null dailyCallTime.
//   • TIMEZONE: a user is "due" only once their CURRENT local time (computed via
//     Intl.DateTimeFormat in profile.timezone) is at/after their dailyCallTime
//     for their local day.
//   • IDEMPOTENCY (no new column): we skip anyone who already has a
//     `scheduled_call` session that started within their local day. That row is
//     written by the post-call webhook, so under a once-daily cron each enabled
//     user is dialed ~once/day and never twice. (Caveat: the session is recorded
//     only after the call completes, so a re-fire within the same call window
//     could still double-dial; under daily-on-Hobby that window never recurs.)
//
// MINUTE PRECISION still depends on cron cadence — Hobby is daily-only and fires
// anywhere within the hour — so the time is honored as "around" the set time.
// An hourly cron would tighten this (the at/after-local-time + same-day guard is
// already correct for that cadence). The "Call me now" button is unaffected.

import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, profiles, sessions } from "@/lib/db/schema";
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

/**
 * The user's current wall-clock minutes-since-midnight + the UTC instant of
 * their local midnight, computed in their IANA zone. Returns null if the zone
 * is unusable (so we skip rather than dial at the wrong hour).
 */
function localDayContext(
  tz: string,
  now: Date,
): { minutesNow: number; localMidnightUtc: Date } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    let hour = get("hour");
    if (hour === 24) hour = 0; // some engines report midnight as 24
    const minute = get("minute");
    const second = get("second");
    if ([hour, minute, second].some((n) => Number.isNaN(n))) return null;
    const minutesNow = hour * 60 + minute;
    // Local midnight, as a UTC instant: now minus the elapsed local seconds.
    const elapsedMs = (hour * 3600 + minute * 60 + second) * 1000;
    const localMidnightUtc = new Date(now.getTime() - elapsedMs);
    return { minutesNow, localMidnightUtc };
  } catch {
    return null;
  }
}

/** Parse "HH:MM" to minutes-since-midnight, or null if malformed. */
function parseHhmm(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret()}`;
  // Constant-time compare — bail on length mismatch first (timingSafeEqual
  // throws on unequal-length buffers, and that itself would leak length).
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, {
      status: 401,
    });
  }

  const now = new Date();

  // Enabled = has a phone AND a non-null dailyCallTime (null = calls off).
  const enabled = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      phoneE164: profiles.phoneE164,
      timezone: profiles.timezone,
      dailyCallTime: profiles.dailyCallTime,
    })
    .from(profiles)
    .where(
      and(isNotNull(profiles.phoneE164), isNotNull(profiles.dailyCallTime)),
    );

  const results: Array<{
    userId: string;
    ok: boolean;
    conversationId?: string | null;
    error?: string;
  }> = [];
  let dueCount = 0;
  let skippedNotDue = 0;
  let skippedAlready = 0;

  // sequential — guard each failure so one bad number doesn't abort the rest
  for (const p of enabled) {
    const toNumber = p.phoneE164?.trim();
    if (!toNumber) continue;

    const callMinutes = parseHhmm(p.dailyCallTime ?? "");
    if (callMinutes === null) continue; // malformed time → treat as not set

    const ctx = localDayContext(p.timezone ?? "UTC", now);
    if (!ctx) continue; // unusable zone → skip rather than mis-time

    // Due only once we've reached their set time within their local day.
    if (ctx.minutesNow < callMinutes) {
      skippedNotDue++;
      continue;
    }

    // Idempotency: already have a scheduled_call session today (local day)?
    try {
      const already = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, p.id),
            eq(sessions.type, "scheduled_call"),
            gte(sessions.startedAt, ctx.localMidnightUtc),
          ),
        )
        .limit(1);
      if (already[0]) {
        skippedAlready++;
        continue;
      }
    } catch (err) {
      // Don't double-dial on an uncertain read — skip and try next cron tick.
      console.error("[cron/daily] idempotency check failed for", p.id, err);
      continue;
    }

    dueCount++;
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
    enabled: enabled.length,
    due: dueCount,
    placed,
    failed: results.length - placed,
    skippedNotDue,
    skippedAlready,
    results,
  });
}
