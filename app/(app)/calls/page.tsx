import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { entries, sessions, summaries } from "@/lib/db/schema";
import { CallLog, type CallLogItem, type CallTurn } from "./call-log";

// The call/voice log. Every finished voice conversation (phone or in-browser)
// already lands in `sessions` (+ transcript), gets distilled into `entries`, and
// gets a per-session daily `summary` (sourceSessionIds = [sessionId]) via the
// post-call webhook. This page just reads that back, newest first.
export const dynamic = "force-dynamic";

const VOICE_TYPES = ["scheduled_call", "on_demand_voice"] as const;

type RawTurn = { role?: unknown; message?: unknown };

function mapTurns(transcript: unknown): CallTurn[] {
  if (!Array.isArray(transcript)) return [];
  const out: CallTurn[] = [];
  for (const t of transcript as RawTurn[]) {
    const text = typeof t?.message === "string" ? t.message.trim() : "";
    if (!text) continue;
    const role = t?.role;
    if (role === "user") out.push({ role: "user", text });
    else if (role === "agent" || role === "assistant" || role === "socrates")
      out.push({ role: "socrates", text });
  }
  return out;
}

export default async function CallsPage() {
  const { userId } = await requireProfile();

  const sess = await db
    .select({
      id: sessions.id,
      type: sessions.type,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      transcript: sessions.transcript,
    })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), inArray(sessions.type, [...VOICE_TYPES])),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(50);

  const ids = sess.map((s) => s.id);

  const [ent, sums] = ids.length
    ? await Promise.all([
        db
          .select({
            sessionId: entries.sessionId,
            type: entries.type,
            content: entries.content,
            themes: entries.themes,
          })
          .from(entries)
          .where(
            and(eq(entries.userId, userId), inArray(entries.sessionId, ids)),
          )
          .orderBy(asc(entries.createdAt)),
        db
          .select({
            content: summaries.content,
            sourceSessionIds: summaries.sourceSessionIds,
          })
          .from(summaries)
          .where(
            and(eq(summaries.userId, userId), eq(summaries.kind, "daily")),
          )
          .orderBy(desc(summaries.createdAt))
          .limit(200),
      ])
    : [[], []];

  // Per-session daily summary (the webhook writes sourceSessionIds = [sessionId]).
  const summaryBySession = new Map<string, string>();
  for (const s of sums) {
    for (const sid of s.sourceSessionIds ?? []) {
      if (sid && !summaryBySession.has(sid)) summaryBySession.set(sid, s.content);
    }
  }

  const entriesBySession = new Map<string, CallLogItem["entries"]>();
  for (const e of ent) {
    if (!e.sessionId) continue;
    const arr = entriesBySession.get(e.sessionId) ?? [];
    arr.push({ type: e.type, content: e.content, themes: e.themes ?? [] });
    entriesBySession.set(e.sessionId, arr);
  }

  const items: CallLogItem[] = sess
    .map((s) => {
      const turns = mapTurns(s.transcript);
      const durationSecs =
        s.endedAt && s.startedAt
          ? Math.max(
              0,
              Math.round(
                (new Date(s.endedAt).getTime() -
                  new Date(s.startedAt).getTime()) /
                  1000,
              ),
            )
          : null;
      return {
        id: s.id,
        type: s.type as CallLogItem["type"],
        startedAt: new Date(s.startedAt).toISOString(),
        durationSecs,
        summary: summaryBySession.get(s.id) ?? null,
        entries: entriesBySession.get(s.id) ?? [],
        turns,
      };
    })
    // Hide empty shells (a call that connected but produced nothing).
    .filter((c) => c.summary || c.entries.length > 0 || c.turns.length > 0);

  return <CallLog items={items} />;
}
