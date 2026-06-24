// Floating demo dates. GET, fired by Vercel Cron (UTC) — see vercel.json.
// Vercel sends `Authorization: Bearer <CRON_SECRET>`; we verify it.
//
// The curated demo dataset is seeded relative to "now", so without this it would
// age — "today, distilled" would slide into the past and the demo would look
// stale on any day after seeding. This shifts the DEMO account's timestamps
// forward by whole local (Asia/Singapore) days so the newest item always lands on
// "today" and the whole timeline floats with the calendar. It NEVER touches any
// other account. Idempotent: the shift is computed as (today − newest day), so a
// missed day catches up and a same-day re-run is a no-op (delta 0).

import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DEMO_USER_ID } from "@/lib/demo";

export const runtime = "nodejs";

const TZ = "Asia/Singapore";

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret()}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const U = DEMO_USER_ID;
  try {
    const shiftedDays = await db.transaction(async (tx) => {
      // Whole-day delta between today (local) and the newest entry's local day.
      const res = await tx.execute(sql`
        select coalesce(
          (now() at time zone ${TZ})::date
            - (max(created_at) at time zone ${TZ})::date,
          0
        )::int as days
        from entries where user_id = ${U}`);
      // postgres-js (this project's driver) returns the rows as an array.
      const rows = res as unknown as Array<{ days: number }>;
      const days = Number(rows[0]?.days ?? 0);
      if (!days) return 0;

      const iv = sql`make_interval(days => ${days})`;
      await tx.execute(
        sql`update entries set created_at = created_at + ${iv} where user_id = ${U}`,
      );
      await tx.execute(sql`
        update sessions
           set started_at = started_at + ${iv},
               ended_at = case when ended_at is null then null else ended_at + ${iv} end
         where user_id = ${U}`);
      await tx.execute(sql`
        update messages set created_at = created_at + ${iv}
         where session_id in (select id from sessions where user_id = ${U})`);
      await tx.execute(sql`
        update summaries
           set period_start = period_start + ${iv},
               period_end = period_end + ${iv},
               created_at = created_at + ${iv}
         where user_id = ${U}`);
      await tx.execute(
        sql`update patterns set surfaced_at = surfaced_at + ${iv} where user_id = ${U}`,
      );
      await tx.execute(sql`
        update themes set first_seen = first_seen + ${iv}, last_seen = last_seen + ${iv}
         where user_id = ${U}`);
      return days;
    });

    return NextResponse.json({ ok: true, shiftedDays, demo: U });
  } catch (err) {
    console.error("[cron/float-demo] shift failed", err);
    return NextResponse.json(
      { ok: false, error: "shift failed" },
      { status: 500 },
    );
  }
}
