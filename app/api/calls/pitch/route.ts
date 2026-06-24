// The PUBLIC on-stage "call my phone" endpoint. POST, NO auth: anyone on the
// pitch deck can press a button and Socrates rings the OWNER's phone live, in
// front of the room. It speaks from the CURATED DEMO account's memory (so the
// call is rich and on-message) and is flagged demo:"1" so the post-call webhook
// SKIPS persistence — the call must never pollute the curated demo bank.
//
// Mirrors app/api/calls/trigger/route.ts (recentThread helper, error shapes,
// runtime) but is public + cooldown-guarded instead of auth-gated.
//
// Contract:
//   POST /api/calls/pitch
//   -> 200 { ok: true, conversationId?, callSid? }
//   -> 200 { ok: false, cooldown: true, error }   (per-IP rate limit)
//   -> 4xx/5xx { ok: false, error }

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getProfile } from "@/lib/auth";
import { DEMO_USER_ID, CALLS_OWNER_USER_ID } from "@/lib/demo";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { startOutboundCall } from "@/lib/elevenlabs/calls";
import { generateOpener } from "@/lib/llm/opener";

export const runtime = "nodejs";

// A light, in-memory per-IP cooldown so an over-eager audience can't machine-gun
// the owner's phone. Module-level: best-effort within a single warm instance —
// enough friction for a live demo, not a hard guarantee.
const COOLDOWN_MS = 45_000;
const lastCallByIp = new Map<string, number>();

/** A one-line continuity hook from the most recent demo entry, for the open. */
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
    // keep it short — it is read into the agent's opening, not the whole bank
    return content.length > 220 ? `${content.slice(0, 217)}...` : content;
  } catch (err) {
    console.error("[calls/pitch] recentThread failed", err);
    return "";
  }
}

export async function POST(req: Request) {
  // Per-IP cooldown.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const last = lastCallByIp.get(ip);
  if (last && now - last < COOLDOWN_MS) {
    return NextResponse.json({
      ok: false,
      cooldown: true,
      error: "Give it a few seconds and try again.",
    });
  }

  // The call rings the OWNER's verified phone (the only number Twilio trial dials).
  const owner = await getProfile(CALLS_OWNER_USER_ID);
  const toNumber = owner?.phoneE164?.trim();
  if (!toNumber) {
    return NextResponse.json(
      { ok: false, error: "Call line isn't configured." },
      { status: 500 },
    );
  }

  // The opener + continuity hook come from the CURATED DEMO account's memory.
  const [firstMessage, recent] = await Promise.all([
    generateOpener(DEMO_USER_ID, "call", "there"),
    recentThread(DEMO_USER_ID),
  ]);

  // Reserve the cooldown slot before dialing so concurrent presses can't both
  // place a call. (A failed dial below still consumes the slot — that's fine for
  // a live demo; the friendly error tells them to wait a moment.)
  lastCallByIp.set(ip, now);

  try {
    const result = await startOutboundCall({
      toNumber,
      dynamicVariables: {
        // user_id = DEMO so Socrates speaks from the curated demo memory;
        // demo:"1" so the webhook's isDemoEvent skips ALL persistence.
        user_id: DEMO_USER_ID,
        display_name: "Visitor",
        recent_thread: recent,
        first_message: firstMessage,
        demo: "1",
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.message || "Couldn't place the call." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      conversationId: result.conversationId,
      callSid: result.callSid,
    });
  } catch (err) {
    console.error("[calls/pitch] startOutboundCall failed", err);
    return NextResponse.json(
      { ok: false, error: "Couldn't place the call." },
      { status: 502 },
    );
  }
}
