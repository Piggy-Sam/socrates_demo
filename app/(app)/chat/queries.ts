// Server-only reads for the chat history sidebar + resuming a conversation.
// Imported by server components (the chat layout and the [id] page); not a
// "use server" actions module. Every query is explicitly scoped by user id.

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, messages, sessions, summaries } from "@/lib/db/schema";

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

// Closing the loop: a banked thought or a finished call can be carried BACK into
// thinking. The chat composer accepts a server-resolved seed (never client text
// — the id is resolved against the user's own rows here) that prefills, but does
// not auto-send, the composer. The framing is an invitation to press further on
// the user's OWN words, not a prompt that thinks for them.

// Collapse a stored thought down to a single clean line to seed the composer:
// strip markdown emphasis/headings/bullets, take the first sentence-ish chunk,
// and clamp it so the prefill stays a starting point, not a wall of text.
function oneLine(text: string, max = 220): string {
  const clean = text
    .replace(/[*_`#>]+/g, " ") // markdown emphasis/heading/quote marks
    .replace(/^\s*[-•]\s+/gm, "") // list bullets
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  // Prefer the first sentence; fall back to the whole (clamped) line.
  const firstStop = clean.search(/[.?!](\s|$)/);
  const head =
    firstStop > 40 ? clean.slice(0, firstStop + 1) : clean;
  if (head.length <= max) return head;
  return head.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Resolve a banked entry into a one-line callback prompt for the composer, after
 * verifying ownership. Returns null if the entry isn't the user's (or is gone),
 * so a tampered ?from= silently no-ops instead of leaking anything.
 */
export async function resolveEntrySeed(
  userId: string,
  entryId: string,
): Promise<string | null> {
  const rows = await db
    .select({ content: entries.content })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);
  const content = rows[0]?.content;
  if (!content) return null;
  const line = oneLine(content);
  if (!line) return null;
  return `I want to press further on something I banked: ${line}`;
}

/**
 * Resolve a finished voice session into a callback prompt seeded from its daily
 * summary (the webhook writes sourceSessionIds = [sessionId]), after verifying
 * the session is the user's. Returns null if unowned or nothing was distilled.
 */
export async function resolveCallSeed(
  userId: string,
  sessionId: string,
): Promise<string | null> {
  const owned = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  if (!owned[0]) return null;

  // The per-session daily summary; pick the most recent if more than one matches.
  const sums = await db
    .select({
      content: summaries.content,
      sourceSessionIds: summaries.sourceSessionIds,
    })
    .from(summaries)
    .where(and(eq(summaries.userId, userId), eq(summaries.kind, "daily")))
    .orderBy(desc(summaries.createdAt))
    .limit(200);
  const match = sums.find((s) =>
    (s.sourceSessionIds ?? []).includes(sessionId),
  );
  if (!match) return null;
  const line = oneLine(match.content);
  if (!line) return null;
  return `I want to take something from a call further in writing: ${line}`;
}
