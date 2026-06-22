"use server";

// Persistence for the text chat. The client calls ensureChatSession() on first
// send (to get/create an open `chat` session), then persistTurn() after each
// completed Socrates reply. Everything is scoped to the authenticated user.

import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages, sessions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

// Reuse a recent open chat session rather than spawning a new one per page load.
const SESSION_REUSE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Return the id of the user's active `chat` session, creating one if none is
 * open (or the last one is stale). An open session has no ended_at.
 */
export async function ensureChatSession(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");

  const since = new Date(Date.now() - SESSION_REUSE_WINDOW_MS);
  const existing = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, user.id),
        eq(sessions.type, "chat"),
        isNull(sessions.endedAt),
        gt(sessions.startedAt, since),
      ),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(1);

  if (existing[0]) return existing[0].id;

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
