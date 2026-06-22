// The distillation pipeline. From a finished session's transcript we run ONE
// structured OpenAI call that returns BOTH the atomic entries AND a short daily
// summary (lean: Hobby caps functions at 30s — fewer calls is the whole game),
// then embed the entries, insert them, upsert the user's themes, and store the
// daily summary. All writes are scoped to the user; the DB client is the trusted
// server path (RLS-bypassing) — callers must pass a verified userId.
//
// Socrates' values hold even here, in the dark, where no one is listening: we
// SURFACE the person's thoughts in their own words, never interpret, never
// flatter, never grade. The summary is a quiet mirror, not a report card.

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, summaries, themes } from "@/lib/db/schema";
import type { EntryType } from "@/lib/constellation";
import { embedMany, openai } from "@/lib/openai";
import { env } from "@/lib/env";
import type {
  Distillation,
  ExtractAndStoreResult,
  ExtractedEntry,
  TranscriptTurn,
} from "./types";

const ENTRY_TYPES: EntryType[] = [
  "idea",
  "opinion",
  "feeling",
  "observation",
  "question",
  "decision",
];

// The structured-output contract for the single extraction call. Strict schema
// so the model returns exactly the bank's atomic shape — no prose to parse.
const DISTILLATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["entries", "summary"],
  properties: {
    entries: {
      type: "array",
      description:
        "Atomic thoughts the PERSON expressed (not Socrates). One self-contained thought each, in the person's own words.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "content", "themes"],
        properties: {
          type: {
            type: "string",
            enum: ENTRY_TYPES,
            description: "The kind of thought.",
          },
          content: {
            type: "string",
            description:
              "The thought, surfaced faithfully in the person's voice. Never appraised, summarized into a verdict, or flattered.",
          },
          themes: {
            type: "array",
            description:
              "1-3 short lowercase thematic tags (e.g. 'work', 'indecision') that let this thread connect across time.",
            items: { type: "string" },
          },
        },
      },
    },
    summary: {
      type: "string",
      description:
        "A short markdown daily summary in Socrates' restrained voice. No praise, no metrics, no advice — a quiet mirror of what moved today and the questions left open.",
    },
  },
} as const;

const SYSTEM = `You distill a thinking session into a knowledge bank, working under Socrates' values.

You are NOT an assistant or an evaluator. Your job is to SURFACE the person's own thoughts faithfully, never to judge, praise, grade, or interpret them. The person's half-formed thought matters more than anything you could say about it.

Extract ENTRIES — atomic thoughts the PERSON expressed (ignore Socrates' questions; capture what the person was working out). Each entry is one self-contained thought in the person's own voice, classified as one of: idea, opinion, feeling, observation, question, decision. Tag each with 1-3 short lowercase themes that could recur over time. Do not invent thoughts that weren't there. If the session was thin, return few entries — never pad.

Write a short SUMMARY in markdown, in Socrates' voice: low, warm, dry, unhurried. Mirror what the person was circling and the questions still open. Forbidden: praise ("great", "insightful"), encouragement, advice, verdicts, metrics, streaks, or any "good job" framing. No headings unless they earn their place. A few sentences or short paragraphs is plenty. If there was almost nothing said, say so plainly and briefly.`;

function buildUserPrompt(transcriptText: string): string {
  return `Here is the transcript of a thinking session (roles: "Person" and "Socrates"). Distill it.\n\n${transcriptText}`;
}

/** Render canonical turns into the role-labelled text the model reasons over. */
export function renderTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((t) => `${t.role === "user" ? "Person" : "Socrates"}: ${t.content}`)
    .join("\n");
}

function clean(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

/** Normalize + validate the model's JSON into a safe Distillation. */
function coerceDistillation(raw: unknown): Distillation {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawEntries = Array.isArray(obj.entries) ? obj.entries : [];
  const entriesOut: ExtractedEntry[] = [];

  for (const e of rawEntries) {
    const item = (e ?? {}) as Record<string, unknown>;
    const content = clean(item.content);
    if (!content) continue;
    const type = ENTRY_TYPES.includes(item.type as EntryType)
      ? (item.type as EntryType)
      : "observation";
    const themesRaw = Array.isArray(item.themes) ? item.themes : [];
    const themesOut = Array.from(
      new Set(
        themesRaw
          .map((t) => clean(t).toLowerCase())
          .filter(Boolean)
          .slice(0, 4),
      ),
    );
    entriesOut.push({ type, content, themes: themesOut });
  }

  return { entries: entriesOut, summary: clean(obj.summary) };
}

/**
 * The single OpenAI call: transcript -> { entries, summary }. Reusable by the
 * webhook and by any other surface (e.g. text chat) that wants to fill the bank.
 * userId/sessionId are accepted for the caller's context but are not sent to the
 * model. Never throws on empty input — returns an empty distillation.
 */
export async function distillTranscript(
  _userId: string,
  _sessionId: string,
  transcriptText: string,
): Promise<Distillation> {
  if (!transcriptText.trim()) return { entries: [], summary: "" };

  const res = await openai().chat.completions.create({
    model: env.openaiModel(),
    temperature: 0.5,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildUserPrompt(transcriptText) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "distillation",
        strict: true,
        schema: DISTILLATION_SCHEMA,
      },
    },
  });

  const text = res.choices[0]?.message?.content ?? "{}";
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[pipeline] failed to parse distillation JSON", text.slice(0, 400));
  }
  return coerceDistillation(parsed);
}

type ExtractAndStoreParams = {
  userId: string;
  sessionId: string;
  /** Either pre-rendered transcript text, or canonical turns to render. */
  transcriptText?: string;
  turns?: TranscriptTurn[];
  /** Period for the daily summary; defaults to the day the session ended. */
  periodStart?: Date;
  periodEnd?: Date;
  /** Stored on the summary row for provenance. */
  sourceSessionIds?: string[];
};

/**
 * Full pipeline: distill -> embed -> insert entries -> upsert themes -> store the
 * daily summary. Every stage is wrapped so a late failure never loses earlier
 * work; the caller (the webhook) can still ack 200. Scoped to one user.
 */
export async function extractAndStore(
  params: ExtractAndStoreParams,
): Promise<ExtractAndStoreResult> {
  const {
    userId,
    sessionId,
    turns,
    periodStart,
    periodEnd,
    sourceSessionIds,
  } = params;

  const transcriptText =
    params.transcriptText ?? (turns ? renderTranscript(turns) : "");

  const distillation = await distillTranscript(
    userId,
    sessionId,
    transcriptText,
  );

  const result: ExtractAndStoreResult = {
    sessionId,
    entriesInserted: 0,
    themesTouched: 0,
    summaryId: null,
    distillation,
  };

  // ── entries (embed + insert) ──────────────────────────────────────────────
  if (distillation.entries.length > 0) {
    try {
      const vectors = await embedMany(
        distillation.entries.map((e) => e.content),
      );
      const rows = distillation.entries.map((e, i) => ({
        userId,
        sessionId,
        type: e.type,
        content: e.content,
        embedding: vectors[i] ?? null,
        themes: e.themes.length ? e.themes : null,
      }));
      const inserted = await db.insert(entries).values(rows).returning({
        id: entries.id,
      });
      result.entriesInserted = inserted.length;
    } catch (err) {
      console.error("[pipeline] entry embed/insert failed", err);
    }
  }

  // ── themes (upsert label-keyed per user; bump count + last_seen) ───────────
  if (result.entriesInserted > 0) {
    const counts = new Map<string, number>();
    for (const e of distillation.entries) {
      for (const t of e.themes) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    for (const [label, count] of counts) {
      try {
        const existing = await db
          .select({ id: themes.id, entryCount: themes.entryCount })
          .from(themes)
          .where(and(eq(themes.userId, userId), eq(themes.label, label)))
          .limit(1);

        if (existing[0]) {
          await db
            .update(themes)
            .set({
              entryCount: (existing[0].entryCount ?? 0) + count,
              lastSeen: sql`now()`,
            })
            .where(eq(themes.id, existing[0].id));
        } else {
          await db.insert(themes).values({
            userId,
            label,
            entryCount: count,
          });
        }
        result.themesTouched += 1;
      } catch (err) {
        console.error(`[pipeline] theme upsert failed for "${label}"`, err);
      }
    }
  }

  // ── daily summary ─────────────────────────────────────────────────────────
  if (distillation.summary.trim()) {
    try {
      const end = periodEnd ?? new Date();
      const start = periodStart ?? startOfDay(end);
      const inserted = await db
        .insert(summaries)
        .values({
          userId,
          kind: "daily",
          periodStart: start,
          periodEnd: end,
          content: distillation.summary.trim(),
          sourceSessionIds: sourceSessionIds ?? [sessionId],
        })
        .returning({ id: summaries.id });
      result.summaryId = inserted[0]?.id ?? null;
    } catch (err) {
      console.error("[pipeline] summary insert failed", err);
    }
  }

  return result;
}

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}
