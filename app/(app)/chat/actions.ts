"use server";

// Mutations for the text chat, callable from the client. Reads used by server
// components live in ./queries (plain module, not actions). Everything is scoped
// to the authenticated user.

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages, sessions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { extractAndStore } from "@/lib/pipeline/extraction";
import { detectPatterns } from "@/lib/pipeline/patterns";
import type { TranscriptTurn } from "@/lib/pipeline/types";

/**
 * Start a NEW chat conversation and return its session id. Unlike the old
 * reuse-an-open-session behavior, every "new chat" is its own durable thread the
 * user can list and resume later (the ChatGPT-style model). Created lazily on
 * the first send, so opening /chat without typing never spawns an empty row.
 */
export async function createChatSession(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");

  const inserted = await db
    .insert(sessions)
    .values({ userId: user.id, type: "chat" })
    .returning({ id: sessions.id });

  return inserted[0].id;
}

/**
 * Persist one completed exchange: the user's message and Socrates' reply, as two
 * rows in `messages`. Verifies the session belongs to the caller before writing.
 */
export async function persistTurn(
  sessionId: string,
  userText: string,
  socratesText: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");

  const owned = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
    .limit(1);
  if (!owned[0]) throw new Error("Session not found.");

  const rows: (typeof messages.$inferInsert)[] = [];
  if (userText.trim()) {
    rows.push({ sessionId, role: "user", content: userText.trim() });
  }
  if (socratesText.trim()) {
    rows.push({ sessionId, role: "socrates", content: socratesText.trim() });
  }
  if (rows.length === 0) return;

  await db.insert(messages).values(rows);
}

/**
 * Feed a finished text-chat session into the SAME distillation pipeline that
 * VOICE uses (extractAndStore): entries land in the bank, themes accrue, and a
 * daily summary is written. Without this, written conversations never reach
 * /bank, /today, or the weekly recap — only voice did. The landing page
 * promises "Speak it, or write it," so chat must join the bank too.
 *
 * IDEMPOTENT by design. Unlike the voice webhook (which dedupes once on
 * elevenlabs_conversation_id and never reprocesses), this is triggered after a
 * quiet period as a session grows, so it may run many times for one session —
 * and two fast runs can overlap. We hand the whole re-extraction to the pipeline
 * core with `replaceForSession`: it undoes the prior run's additive theme bump,
 * deletes this session's entries + its single-session daily summary, and
 * re-inserts a fresh distillation of the whole conversation — atomically, under
 * a per-session advisory lock, so concurrent runs serialize instead of
 * double-decrementing theme counts or duplicating entries.
 *
 * Verifies session ownership + type before touching anything (like persistTurn).
 */
export async function extractChatSession(sessionId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");

  const owned = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, user.id),
        eq(sessions.type, "chat"),
      ),
    )
    .limit(1);
  if (!owned[0]) throw new Error("Session not found.");

  // Load the conversation in order and map to the pipeline's canonical turns.
  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));
  const turns: TranscriptTurn[] = rows.map((r) => ({
    role: r.role,
    content: r.content,
  }));
  if (turns.length === 0) return;

  // Re-distill the whole conversation through the shared, idempotent core. The
  // delete-then-reinsert compensation lives inside extractAndStore (next to the
  // code it compensates) and runs atomically under a per-session lock.
  const result = await extractAndStore({
    userId: user.id,
    sessionId,
    turns,
    sourceSessionIds: [sessionId],
    replaceForSession: true,
  });

  // OFF the hot path: hold up any patterns across the person's thinking. Fire-
  // and-forget with its own try/catch — it must never block, delay, or fail the
  // distill. Only when this run actually produced entries (no entries, no new
  // signal worth a model call).
  if (result.entriesInserted > 0) {
    void detectPatterns(user.id).catch((err) =>
      console.error("[patterns] post-chat detection failed", err),
    );
  }
}
