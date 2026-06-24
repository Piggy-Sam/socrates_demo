// The patterns detector — Socrates' heaviest memory move. We hold up a pattern
// across the person's thinking over time (a recurring thread, a contradiction,
// an abandoned line) and hand it back as an OPEN QUESTION for THEM to examine —
// never a diagnosis, verdict, or psychoanalysis. The patterns table is surfaced,
// NEVER interpreted (SPEC §2; the soul in system-prompt.ts). This pass runs OFF
// the hot path after a session distills, makes ONE time-boxed, restrained OpenAI
// call, and is heavily gated: capped per run, deduped against recent patterns,
// and only emits when there's real recurring signal. Scoped to one user; the DB
// client is the trusted server path, so callers must pass a verified userId.

import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, patterns, themes } from "@/lib/db/schema";
import { openai } from "@/lib/openai";
import { env } from "@/lib/env";

// Restraint knobs. Few rows, real signal, no re-emitting the same thing.
const MAX_NEW_PER_RUN = 2;
// A "recurring" pattern needs a theme that genuinely recurred (>=2 entries).
const MIN_THEME_COUNT = 2;
// How far back we read to dedupe / detect — recent thinking only.
const RECENT_ENTRY_LIMIT = 40;
const RECENT_PATTERN_LIMIT = 12;
const DETECT_WINDOW_DAYS = 60;
// Hard ceiling on the model call — this runs fire-and-forget but Hobby caps
// function time, so never let it run long.
const DETECT_RACE_MS = 12_000;

const PATTERN_KINDS = ["recurring", "contradiction", "abandoned"] as const;
type PatternKind = (typeof PATTERN_KINDS)[number];

// The structured-output contract: 0..N candidate patterns, each a neutral
// observation or open question with provenance pointing at the source entries.
const PATTERNS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["patterns"],
  properties: {
    patterns: {
      type: "array",
      description:
        "Zero or more patterns you can genuinely SEE across this person's thinking. Empty is the right answer when nothing recurs. Never invent one to fill the list.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "summary", "entryIds"],
        properties: {
          kind: {
            type: "string",
            enum: [...PATTERN_KINDS],
            description:
              "recurring = a thread they keep returning to; contradiction = a belief held against another; abandoned = a line they opened and dropped.",
          },
          summary: {
            type: "string",
            description:
              "A NEUTRAL observation or an OPEN QUESTION in Socrates' restrained voice, phrased so THEY supply the meaning. e.g. 'You keep returning to leaving the job — what's underneath that?'. NEVER a judgment, diagnosis, label, advice, or psychoanalysis.",
          },
          entryIds: {
            type: "array",
            description:
              "The ids of the source entries (from the digest) this pattern is drawn from. Only ids that appear in the digest.",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You are Socrates' memory, working across one person's thinking over time. Your single job is to HOLD UP a pattern you can genuinely see in what they have written — and hand it back as an OPEN QUESTION for THEM to examine. You surface; they supply the meaning.

You may surface three kinds of pattern:
- recurring: a thread, idea, or tension they keep returning to across different moments.
- contradiction: a belief or stance held plainly against another of their own.
- abandoned: a line of thinking they opened with energy and then dropped.

ABSOLUTE CONSTRAINTS — these are the soul, never bend them:
- You NEVER interpret, diagnose, label, advise, psychoanalyze, or pass a verdict. You do not say what a pattern MEANS about the person — that is theirs alone.
- Every summary is a NEUTRAL OBSERVATION or an OPEN QUESTION, phrased so the person answers it in their own words. Curious, never accusing.
  - GOOD: "You keep circling back to whether to leave — what's underneath it?"
  - GOOD: "Three weeks ago you were sure; this week you're not. What changed?"
  - FORBIDDEN: "You're avoidant." / "You self-sabotage." / "You should decide." / "This shows fear of commitment." / any praise, grade, or value-judgment.
- No flattery, no metrics, no 'you've done X' framing, no counts.
- Only surface a pattern that is REALLY there in the digest. If nothing genuinely recurs, return an empty list — that is the correct, honest answer. Do not pad.
- Draw each pattern only from entries present in the digest, and cite their ids in entryIds.

Be sparing. At most a couple of patterns, and only the ones a careful reader would actually see. When in doubt, surface nothing.`;

type DigestEntry = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
  sessionId: string | null;
  themes: string[] | null;
};

type CandidatePattern = {
  kind: PatternKind;
  summary: string;
  entryIds: string[];
};

function clean(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

/** A normalized key for dedupe: lowercased, alnum-only, collapsed. */
function normKey(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Coerce the model's JSON into safe candidates, dropping anything malformed. */
function coerce(raw: unknown, validEntryIds: Set<string>): CandidatePattern[] {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(obj.patterns) ? obj.patterns : [];
  const out: CandidatePattern[] = [];
  for (const p of list) {
    const item = (p ?? {}) as Record<string, unknown>;
    const summary = clean(item.summary);
    if (!summary) continue;
    const kind = PATTERN_KINDS.includes(item.kind as PatternKind)
      ? (item.kind as PatternKind)
      : "recurring";
    const idsRaw = Array.isArray(item.entryIds) ? item.entryIds : [];
    const entryIds = Array.from(
      new Set(idsRaw.map(clean).filter((id) => validEntryIds.has(id))),
    );
    out.push({ kind, summary, entryIds });
  }
  return out;
}

/** Build the compact digest the model reasons over (themes + recent entries). */
function buildUserPrompt(
  recurringThemes: { label: string; entryCount: number }[],
  digest: DigestEntry[],
  existing: string[],
): string {
  const themesBlock = recurringThemes.length
    ? recurringThemes
        .map((t) => `- ${t.label} (${t.entryCount} entries)`)
        .join("\n")
    : "(none recurring yet)";

  const entriesBlock = digest
    .map((e) => {
      const day = e.createdAt.toISOString().slice(0, 10);
      const tags = e.themes?.length ? ` [${e.themes.join(", ")}]` : "";
      return `(${e.id}) ${day} · ${e.type}${tags}: ${e.content}`;
    })
    .join("\n");

  const existingBlock = existing.length
    ? existing.map((s) => `- ${s}`).join("\n")
    : "(none yet)";

  return `RECURRING THEMES (label + how often it has come up):
${themesBlock}

RECENT THOUGHTS (id · date · type [themes]: the person's own words):
${entriesBlock}

PATTERNS YOU HAVE ALREADY SURFACED RECENTLY (do NOT repeat these — say something only if it is genuinely new):
${existingBlock}

Hold up at most a couple of patterns you can really see — neutral observations or open questions, never interpretation. If nothing genuinely recurs, return an empty list.`;
}

/**
 * Detect + persist patterns for one user. Restrained, idempotent, time-boxed,
 * and SAFE to call fire-and-forget: it owns its own errors. Returns the number
 * of rows written (0 is the common, correct outcome). Never throws to callers
 * that forget to catch — but callers should still `.catch` per the hook
 * contract, since a thrown DB error before the try would still propagate.
 */
export async function detectPatterns(userId: string): Promise<number> {
  // ── gather a compact digest (themes + recent entries + recent patterns) ──
  const since = new Date(Date.now() - DETECT_WINDOW_DAYS * 86_400_000);

  const [recurringThemes, digest, recentPatterns] = await Promise.all([
    db
      .select({ label: themes.label, entryCount: themes.entryCount })
      .from(themes)
      .where(and(eq(themes.userId, userId), gte(themes.entryCount, MIN_THEME_COUNT)))
      .orderBy(desc(themes.entryCount))
      .limit(12),
    db
      .select({
        id: entries.id,
        type: entries.type,
        content: entries.content,
        createdAt: entries.createdAt,
        sessionId: entries.sessionId,
        themes: entries.themes,
      })
      .from(entries)
      .where(and(eq(entries.userId, userId), gte(entries.createdAt, since)))
      .orderBy(desc(entries.createdAt))
      .limit(RECENT_ENTRY_LIMIT),
    db
      .select({ summary: patterns.summary })
      .from(patterns)
      .where(eq(patterns.userId, userId))
      .orderBy(desc(patterns.surfacedAt))
      .limit(RECENT_PATTERN_LIMIT),
  ]);

  // ── min-signal gate: need recurring themes across >=2 entries AND enough
  //    raw material to see a pattern in. Cheap exit before spending a call. ──
  if (recurringThemes.length === 0 || digest.length < 3) return 0;

  // Patterns must span more than one moment — a single session can't "recur".
  const distinctSessions = new Set(
    digest.map((e) => e.sessionId).filter((s): s is string => Boolean(s)),
  );
  if (distinctSessions.size < 2) return 0;

  const validEntryIds = new Set(digest.map((e) => e.id));
  const existingKeys = new Set(recentPatterns.map((p) => normKey(p.summary)));

  // ── ONE structured, time-boxed model call ──
  const userPrompt = buildUserPrompt(
    recurringThemes,
    digest,
    recentPatterns.map((p) => p.summary),
  );

  let parsed: unknown = {};
  try {
    const res = await Promise.race([
      openai().chat.completions.create({
        model: env.openaiModel(),
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "patterns",
            strict: true,
            schema: PATTERNS_SCHEMA,
          },
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DETECT_RACE_MS)),
    ]);
    if (!res) return 0; // timed out — drop quietly, never block the distill
    const text = res.choices[0]?.message?.content ?? "{}";
    parsed = JSON.parse(text);
  } catch (err) {
    console.error("[patterns] detection call failed", err);
    return 0;
  }

  const candidates = coerce(parsed, validEntryIds);
  if (candidates.length === 0) return 0;

  // ── dedupe (against recent patterns + within this run) + cap ──
  const seen = new Set(existingKeys);
  const toInsert: (typeof patterns.$inferInsert)[] = [];
  for (const c of candidates) {
    const key = normKey(c.summary);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    // Provenance from the cited entries: their ids + the sessions they came from.
    const provEntryIds = c.entryIds;
    const provSessionIds = Array.from(
      new Set(
        digest
          .filter((e) => provEntryIds.includes(e.id) && e.sessionId)
          .map((e) => e.sessionId as string),
      ),
    );

    toInsert.push({
      userId,
      kind: c.kind,
      summary: c.summary,
      provenance: {
        ...(provEntryIds.length ? { entryIds: provEntryIds } : {}),
        ...(provSessionIds.length ? { sessionIds: provSessionIds } : {}),
      },
    });

    if (toInsert.length >= MAX_NEW_PER_RUN) break;
  }

  if (toInsert.length === 0) return 0;

  try {
    await db.insert(patterns).values(toInsert);
  } catch (err) {
    console.error("[patterns] insert failed", err);
    return 0;
  }
  return toInsert.length;
}
