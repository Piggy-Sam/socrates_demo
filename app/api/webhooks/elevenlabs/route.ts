// Post-call webhook. ElevenLabs POSTs the finished conversation here (Transcript
// event, HMAC-signed). We verify the signature, dedupe on conversation_id, store
// the session + messages, run the lean extraction pipeline (ONE OpenAI call for
// entries + daily summary), and return 200. Idempotent + resilient: once the
// session is stored we always ack 200, even if a later stage fails (ElevenLabs
// retries, and we don't want to reprocess a stored conversation). See SPEC §6/§11.

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages, sessions, sessionType } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { extractAndStore } from "@/lib/pipeline/extraction";
import type { TranscriptTurn } from "@/lib/pipeline/types";

type SessionType = (typeof sessionType.enumValues)[number];

export const runtime = "nodejs";
export const maxDuration = 60;

// ── HMAC verification ────────────────────────────────────────────────────────
// ElevenLabs sends `ElevenLabs-Signature: t=<unix>,v0=<hex>` where the signed
// payload is `${t}.${rawBody}` (HMAC-SHA256, hex). We constant-time compare and
// also tolerate a plain hex signature over the raw body (defensive).
function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header) return false;

  let t: string | null = null;
  let v0: string | null = null;
  for (const part of header.split(",")) {
    const [k, val] = part.split("=");
    const key = k?.trim();
    const value = val?.trim();
    if (key === "t") t = value;
    else if (key === "v0") v0 = value;
  }

  // Canonical ElevenLabs form: t=...,v0=...
  if (t && v0) {
    const expected = createHmac("sha256", secret)
      .update(`${t}.${rawBody}`)
      .digest("hex");
    return safeEqualHex(expected, v0);
  }

  // Tolerate a plain hex signature over just the raw body.
  const plain = header.trim();
  const expectedPlain = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expectedPlain, plain);
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

// ── payload helpers ──────────────────────────────────────────────────────────
type ElevenLabsTurn = {
  role?: string;
  message?: string | null;
  time_in_call_secs?: number;
};

type ElevenLabsData = {
  conversation_id?: string;
  agent_id?: string;
  status?: string;
  user_id?: string;
  transcript?: ElevenLabsTurn[];
  metadata?: {
    start_time_unix_secs?: number;
    call_duration_secs?: number;
  };
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, unknown>;
    custom_llm_extra_body?: Record<string, unknown>;
  };
};

type ElevenLabsEvent = {
  type?: string;
  event_timestamp?: number;
  data?: ElevenLabsData;
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Pull the user id from the event: top-level, then dynamic variables. */
function resolveUserId(data: ElevenLabsData): string | undefined {
  const dyn = data.conversation_initiation_client_data?.dynamic_variables ?? {};
  return (
    asString(data.user_id) ??
    asString(dyn.user_id) ??
    asString(dyn.userId) ??
    asString(dyn.user)
  );
}

/** Map ElevenLabs roles to our message roles ("agent" -> "socrates"). */
function mapRole(role: string | undefined): "user" | "socrates" | null {
  if (role === "user") return "user";
  if (role === "agent" || role === "socrates" || role === "assistant")
    return "socrates";
  return null;
}

/** The session type from the dynamic variables (call vs in-browser voice). */
function resolveSessionType(data: ElevenLabsData): SessionType {
  const dyn = data.conversation_initiation_client_data?.dynamic_variables ?? {};
  const raw =
    asString(dyn.session_type) ??
    asString(dyn.sessionType) ??
    asString(dyn.call_type);
  if (raw === "on_demand_voice" || raw === "scheduled_call") return raw;
  // Heuristic: PSTN calls report a phone authorization method; default to call.
  return "scheduled_call";
}

export async function POST(req: Request) {
  // 1) Verify signature over the RAW body.
  const rawBody = await req.text();
  let secret: string;
  try {
    secret = env.elevenLabsWebhookSecret();
  } catch {
    console.error("[webhook] ELEVENLABS_WEBHOOK_SECRET not configured");
    return new NextResponse("server misconfigured", { status: 500 });
  }

  const sig = req.headers.get("ElevenLabs-Signature");
  if (!verifySignature(rawBody, sig, secret)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  // 2) Parse + filter to post-call transcription events.
  let event: ElevenLabsEvent;
  try {
    event = JSON.parse(rawBody) as ElevenLabsEvent;
  } catch {
    return new NextResponse("bad payload", { status: 400 });
  }

  const type = event.type ?? "";
  if (
    type !== "post_call_transcription" &&
    type !== "transcript" &&
    type !== "post_call_transcript"
  ) {
    // Acknowledge other event kinds without processing.
    return NextResponse.json({ ok: true, ignored: type || "unknown" });
  }

  const data = event.data ?? {};
  const conversationId = asString(data.conversation_id);
  if (!conversationId) {
    return new NextResponse("missing conversation_id", { status: 400 });
  }

  // 3) Dedupe — ElevenLabs retries; never reprocess.
  try {
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.elevenlabsConversationId, conversationId))
      .limit(1);
    if (existing[0]) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }
  } catch (err) {
    console.error("[webhook] dedupe lookup failed", err);
    // Continue — a unique conversation_id index would also backstop this.
  }

  // 4) Resolve the user.
  const userId = resolveUserId(data);
  if (!userId) {
    console.error(
      "[webhook] could not resolve user_id for conversation",
      conversationId,
    );
    // Ack so ElevenLabs stops retrying a payload we can't attribute.
    return NextResponse.json({ ok: true, skipped: "no user_id" });
  }

  // 5) Build session timing + turns.
  const meta = data.metadata ?? {};
  const startedAt = meta.start_time_unix_secs
    ? new Date(meta.start_time_unix_secs * 1000)
    : event.event_timestamp
      ? new Date(event.event_timestamp * 1000)
      : new Date();
  const endedAt = meta.call_duration_secs
    ? new Date(startedAt.getTime() + meta.call_duration_secs * 1000)
    : new Date();

  const rawTurns = Array.isArray(data.transcript) ? data.transcript : [];
  const turns: TranscriptTurn[] = [];
  for (const t of rawTurns) {
    const role = mapRole(t.role);
    const content = asString(t.message);
    if (role && content) turns.push({ role, content });
  }

  // 6) Store the session + messages. If this fails we have NOT recorded the
  //    conversation, so return 500 and let ElevenLabs retry.
  let sessionId: string;
  try {
    const inserted = await db
      .insert(sessions)
      .values({
        userId,
        type: resolveSessionType(data),
        startedAt,
        endedAt,
        transcript: rawTurns,
        elevenlabsConversationId: conversationId,
      })
      // atomic dedupe backstop for the SELECT above — the unique index on
      // elevenlabs_conversation_id makes concurrent retries a no-op.
      .onConflictDoNothing({ target: sessions.elevenlabsConversationId })
      .returning({ id: sessions.id });
    if (!inserted[0]) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }
    sessionId = inserted[0].id;

    if (turns.length > 0) {
      await db.insert(messages).values(
        turns.map((t) => ({
          sessionId,
          role: t.role,
          content: t.content,
        })),
      );
    }
  } catch (err) {
    console.error("[webhook] failed to store session", err);
    return new NextResponse("storage failed", { status: 500 });
  }

  // 7-10) Distillation pipeline. The session is now stored, so any failure here
  //       still acks 200 (we won't reprocess this conversation).
  try {
    if (turns.length > 0) {
      const result = await extractAndStore({
        userId,
        sessionId,
        turns,
        periodEnd: endedAt,
        sourceSessionIds: [sessionId],
      });
      return NextResponse.json({
        ok: true,
        sessionId,
        entries: result.entriesInserted,
        themes: result.themesTouched,
        summary: result.summaryId ? "stored" : "none",
      });
    }
    return NextResponse.json({ ok: true, sessionId, entries: 0, empty: true });
  } catch (err) {
    console.error("[webhook] distillation failed (session stored)", err);
    return NextResponse.json({ ok: true, sessionId, distillation: "failed" });
  }
}
