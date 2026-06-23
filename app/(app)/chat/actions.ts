"use server";

// Mutations for the text chat, callable from the client. Reads used by server
// components live in ./queries (plain module, not actions). Everything is scoped
// to the authenticated user.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages, sessions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

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
