// POST /api/voice/token — mint a short-lived ElevenLabs conversation token so the
// in-browser WebRTC client can start an on-demand session WITHOUT ever seeing the
// ELEVENLABS_API_KEY. We also hand the client the dynamic variables the hosted
// agent forwards to our brain (/api/llm/chat/completions) on every turn — most
// importantly `user_id`, so the same Socrates memory follows the person here.

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUser, getProfile } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const runtime = "nodejs";
// Always mint a fresh token; never cache.
export const dynamic = "force-dynamic";

const TOKEN_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/token";

export type VoiceTokenResponse = {
  token: string;
  agentId: string;
  dynamicVariables: {
    user_id: string;
    display_name: string;
    recent_thread?: string;
  };
};

export async function POST() {
  const user = await requireUser();

  let agentId: string;
  let apiKey: string;
  try {
    agentId = env.elevenLabsAgentId();
    apiKey = env.elevenLabsKey();
  } catch (err) {
    console.error("[voice/token] missing ElevenLabs config", err);
    return NextResponse.json(
      { error: "Voice is not configured." },
      { status: 503 },
    );
  }

  // Mint the conversation token. For a private agent this requires the API key;
  // it must never reach the client, which is the whole reason for this route.
  let token: string;
  try {
    const url = `${TOKEN_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[voice/token] ElevenLabs token request failed: ${res.status} ${detail}`,
      );
      return NextResponse.json(
        { error: "Could not reach Socrates right now." },
        { status: 502 },
      );
    }

    const data: unknown = await res.json();
    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as { token?: unknown }).token !== "string"
    ) {
      console.error("[voice/token] malformed token response", data);
      return NextResponse.json(
        { error: "Could not reach Socrates right now." },
        { status: 502 },
      );
    }
    token = (data as { token: string }).token;
  } catch (err) {
    console.error("[voice/token] token fetch threw", err);
    return NextResponse.json(
      { error: "Could not reach Socrates right now." },
      { status: 502 },
    );
  }

  // Best-effort continuity hook: a one-line nudge from the user's most recent
  // thought so the agent can open on a live thread, not "how was your day".
  // Never block the call on this.
  const profile = await getProfile(user.id).catch(() => null);
  const displayName = profile?.displayName ?? "friend";
  const recentThread = await mostRecentThread(user.id);

  const dynamicVariables: VoiceTokenResponse["dynamicVariables"] = {
    user_id: user.id,
    display_name: displayName,
    ...(recentThread ? { recent_thread: recentThread } : {}),
  };

  return NextResponse.json(
    { token, agentId, dynamicVariables } satisfies VoiceTokenResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** One short line from the user's latest entry, or empty if none / on error. */
async function mostRecentThread(userId: string): Promise<string> {
  try {
    const rows = await db
      .select({ content: entries.content })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.createdAt))
      .limit(1);
    const content = rows[0]?.content?.trim();
    if (!content) return "";
    // Keep it to a single clean line for the agent's opener.
    const oneLine = content.replace(/\s+/g, " ");
    return oneLine.length > 240 ? `${oneLine.slice(0, 237)}…` : oneLine;
  } catch (err) {
    console.error("[voice/token] recent thread lookup failed", err);
    return "";
  }
}
