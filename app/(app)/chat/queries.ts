// Server-only reads for the chat history sidebar + resuming a conversation.
// Imported by server components (the chat layout and the [id] page); not a
// "use server" actions module. Every query is explicitly scoped by user id.

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages, sessions } from "@/lib/db/schema";

export type ChatListItem = {
  id: string;
  title: string;
  lastActivity: string; // ISO; for ordering + relative-time display
};

export type ChatTurn = {
  id: string;
  role: "user" | "socrates";
  content: string;
};

const MAX_SESSIONS = 80;

function titleFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 60) return clean;
  return clean.slice(0, 57).trimEnd() + "…";
}

/**
 * List the user's chat conversations, newest activity first. A conversation's
 * title is its first user message; sessions with no messages yet (a brand-new
 * chat that was never sent) are omitted.
 */
export async function getChatSessionList(
  userId: string,
): Promise<ChatListItem[]> {
  const sess = await db
    .select({ id: sessions.id, startedAt: sessions.startedAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.type, "chat")))
    .orderBy(desc(sessions.startedAt))
    .limit(MAX_SESSIONS);

  if (sess.length === 0) return [];

  const ids = sess.map((s) => s.id);
  const msgs = await db
    .select({
      sessionId: messages.sessionId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(inArray(messages.sessionId, ids))
    .orderBy(asc(messages.createdAt));

  // First user message → title; latest message → ordering key.
  const firstUser = new Map<string, string>();
  const lastAt = new Map<string, Date>();
  for (const m of msgs) {
    if (m.role === "user" && !firstUser.has(m.sessionId)) {
      firstUser.set(m.sessionId, m.content);
    }
    lastAt.set(m.sessionId, m.createdAt);
  }

  const items: ChatListItem[] = [];
  for (const s of sess) {
    const title = firstUser.get(s.id);
    if (!title) continue; // skip empty sessions
    const last = lastAt.get(s.id) ?? s.startedAt;
    items.push({
      id: s.id,
      title: titleFromText(title),
      lastActivity: last.toISOString(),
    });
  }

  items.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  return items;
}

/**
 * Load a single conversation's turns for resume, after verifying ownership.
 * Returns null if the session doesn't exist or isn't the user's.
 */
export async function loadChatSession(
  userId: string,
  sessionId: string,
): Promise<ChatTurn[] | null> {
  const owned = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        eq(sessions.type, "chat"),
      ),
    )
    .limit(1);
  if (!owned[0]) return null;

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  return rows.map((r) => ({ id: r.id, role: r.role, content: r.content }));
}
