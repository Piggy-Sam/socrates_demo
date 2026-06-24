// "Call me now" — the PRIMARY demo path. POST, no body needed: reads the
// authenticated user's profile server-side and places an outbound call.
//
// Contract (Track D's button calls this):
//   POST /api/calls/trigger
//   -> 200 { ok: true, conversationId?, callSid? }
//   -> 4xx/5xx { ok: false, error }  (e.g. no phone on file)

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { startOutboundCall } from "@/lib/elevenlabs/calls";

export const runtime = "nodejs";

/** A one-line continuity hook from the user's most recent entry, for the callback open. */
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
    console.error("[calls/trigger] recentThread failed", err);
    return "";
  }
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "You need to be signed in to start a call." },
      { status: 401 },
    );
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Finish onboarding first, then I can call you." },
      { status: 400 },
    );
  }

  const toNumber = profile.phoneE164?.trim();
  if (!toNumber) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "I don't have a number for you yet. Add your phone in settings and I'll call.",
      },
      { status: 400 },
    );
  }

  const displayName = profile.displayName?.trim() || "there";
  const recent = await recentThread(user.id);

  try {
    const result = await startOutboundCall({
      toNumber,
      dynamicVariables: {
        user_id: user.id,
        display_name: displayName,
        recent_thread: recent,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.message || "The call couldn't be placed just now.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      conversationId: result.conversationId,
      callSid: result.callSid,
    });
  } catch (err) {
    console.error("[calls/trigger] startOutboundCall failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong placing the call. Try again in a moment.",
      },
      { status: 502 },
    );
  }
}
