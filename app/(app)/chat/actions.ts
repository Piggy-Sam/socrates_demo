"use server";

// Mutations for the text chat, callable from the client. Reads used by server
// components live in ./queries (plain module, not actions). Everything is scoped
// to the authenticated user.

import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, messages, sessions, summaries, themes } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { extractAndStore } from "@/lib/pipeline/extraction";
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
 * elevenlabs_conversation_id and never reprocesses), this is triggered
 * best-effort after every turn, so it may run many times for one growing
 * session. To keep re-runs from duplicating, we delete-then-reinsert per
 * session before extracting:
 *   - undo the prior run's additive theme bump (decrement entry_count by exactly
 *     what THIS session's existing entries contributed, mirroring the +count
 *     upsert in extractAndStore),
 *   - delete this session's existing entries,
 *   - delete this session's single-session daily summary (sourceSessionIds is
 *     [sessionId], matching how both this path and the webhook write it).
 * extractAndStore then re-inserts a fresh, complete distillation of the whole
 * conversation so far. Calls are awaited sequentially by the client (each send
 * finishes before the next), so this stays consistent run to run.
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

  // ── undo any prior extraction for this session (idempotency) ───────────────
  // Decrement themes by exactly what this session's existing entries added, then
  // remove those entries and the session's daily summary, before re-extracting.
  const prior = await db
    .select({ themes: entries.themes })
    .from(entries)
    .where(and(eq(entries.userId, user.id), eq(entries.sessionId, sessionId)));

  if (prior.length > 0) {
    const counts = new Map<string, number>();
    for (const e of prior) {
      for (const label of e.themes ?? []) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    for (const [label, count] of counts) {
      try {
        await db
          .update(themes)
          .set({ entryCount: sql`greatest(${themes.entryCount} - ${count}, 0)` })
          .where(and(eq(themes.userId, user.id), eq(themes.label, label)));
      } catch (err) {
        console.error(`[chat-extract] theme decrement failed for "${label}"`, err);
      }
    }
    await db
      .delete(entries)
      .where(and(eq(entries.userId, user.id), eq(entries.sessionId, sessionId)));
  }

  await db
    .delete(summaries)
    .where(
      and(
        eq(summaries.userId, user.id),
        eq(summaries.kind, "daily"),
        // single-session daily summary written for THIS chat (== [sessionId]).
        sql`${summaries.sourceSessionIds} = array[${sessionId}]::uuid[]`,
      ),
    );

  // Re-distill the whole conversation through the shared pipeline.
  await extractAndStore({
    userId: user.id,
    sessionId,
    turns,
    sourceSessionIds: [sessionId],
  });
}
