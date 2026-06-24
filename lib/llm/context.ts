// Standing context — the always-on memory that makes Socrates open warm, not
// cold. Where RAG (lib/rag.ts) finds what is semantically relevant to THIS turn,
// the standing context is the durable backdrop of a person's thinking: their most
// recent distillation, the threads they keep returning to, the patterns we've
// surfaced, the questions still open, and their last few notes. It is injected on
// every turn (cheap indexed reads) and reused to write a personalized opener.
//
// Everything here is the PERSON'S OWN material — it is data to read for
// continuity, never instructions to obey, and never ours to interpret for them.

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, patterns, summaries, themes } from "@/lib/db/schema";

// Default budget: a single wall-clock ceiling for the whole parallel fan-out.
// Voice wants the brain's first token fast, so keep this well under a second; the
// queries are all index-backed and run concurrently, so this is ample headroom.
const DEFAULT_BUDGET_MS = 900;

// Per-piece caps — keep the block short enough to inject every turn AND read out
// loud. These are intentionally small; correctness over completeness.
const SUMMARY_MAX_CHARS = 600;
const ENTRY_MAX_CHARS = 220;
const QUESTION_MAX_CHARS = 220;
const THEME_LIMIT = 6;
const PATTERN_LIMIT = 3;
const QUESTION_LIMIT = 3;
const RECENT_ENTRY_LIMIT = 4;

export type StandingContext = {
  /** Most recent daily distillation (trimmed). */
  dailySummary: string;
  /** Top recurring threads as "label (count)". */
  themes: string[];
  /** Recent surfaced patterns as "[kind] summary". */
  patterns: string[];
  /** Recent open questions (their own words). */
  openQuestions: string[];
  /** Last few entries as "(type) content". */
  recentEntries: string[];
};

/** Collapse whitespace and hard-cap a string for compact, spoken-friendly text. */
function oneLine(s: string, max: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1))}…`;
}

/** Resolve a promise but never longer than `ms`; on timeout yield `fallback`. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Fetch the raw standing-context pieces for a user, each guarded by the shared
 * `budgetMs` so a slow DB can never stall the caller past that ceiling. Any piece
 * that fails or times out simply comes back empty; we return whatever resolved.
 */
export async function getStandingContextParts(
  userId: string,
  opts?: { budgetMs?: number },
): Promise<StandingContext> {
  const budgetMs = opts?.budgetMs ?? DEFAULT_BUDGET_MS;

  const dailySummaryQ = db
    .select({ content: summaries.content })
    .from(summaries)
    .where(and(eq(summaries.userId, userId), eq(summaries.kind, "daily")))
    .orderBy(desc(summaries.periodEnd))
    .limit(1);

  const themesQ = db
    .select({ label: themes.label, entryCount: themes.entryCount })
    .from(themes)
    .where(eq(themes.userId, userId))
    .orderBy(desc(themes.entryCount))
    .limit(THEME_LIMIT);

  const patternsQ = db
    .select({ kind: patterns.kind, summary: patterns.summary })
    .from(patterns)
    .where(eq(patterns.userId, userId))
    .orderBy(desc(patterns.surfacedAt))
    .limit(PATTERN_LIMIT);

  const questionsQ = db
    .select({ content: entries.content })
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.type, "question")))
    .orderBy(desc(entries.createdAt))
    .limit(QUESTION_LIMIT);

  const recentEntriesQ = db
    .select({ type: entries.type, content: entries.content })
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.createdAt))
    .limit(RECENT_ENTRY_LIMIT);

  // All five run concurrently; each is independently bounded so a single slow
  // read can't drag the whole fan-out, and allSettled means one rejection never
  // poisons the rest.
  const [summaryR, themesR, patternsR, questionsR, recentR] =
    await Promise.allSettled([
      withTimeout(dailySummaryQ, budgetMs, [] as { content: string }[]),
      withTimeout(
        themesQ,
        budgetMs,
        [] as { label: string; entryCount: number }[],
      ),
      withTimeout(
        patternsQ,
        budgetMs,
        [] as { kind: string; summary: string }[],
      ),
      withTimeout(questionsQ, budgetMs, [] as { content: string }[]),
      withTimeout(
        recentEntriesQ,
        budgetMs,
        [] as { type: string; content: string }[],
      ),
    ]);

  const summaryRow =
    summaryR.status === "fulfilled" ? summaryR.value[0] : undefined;
  const dailySummary = summaryRow?.content
    ? oneLine(summaryRow.content, SUMMARY_MAX_CHARS)
    : "";

  const themeList =
    themesR.status === "fulfilled"
      ? themesR.value
          .filter((t) => t.label?.trim())
          .map((t) => `${t.label.trim()} (${t.entryCount})`)
      : [];

  const patternList =
    patternsR.status === "fulfilled"
      ? patternsR.value
          .filter((p) => p.summary?.trim())
          .map((p) => `[${p.kind}] ${oneLine(p.summary, ENTRY_MAX_CHARS)}`)
      : [];

  const questionList =
    questionsR.status === "fulfilled"
      ? questionsR.value
          .filter((q) => q.content?.trim())
          .map((q) => oneLine(q.content, QUESTION_MAX_CHARS))
      : [];

  const recentList =
    recentR.status === "fulfilled"
      ? recentR.value
          .filter((e) => e.content?.trim())
          .map((e) => `(${e.type}) ${oneLine(e.content, ENTRY_MAX_CHARS)}`)
      : [];

  return {
    dailySummary,
    themes: themeList,
    patterns: patternList,
    openQuestions: questionList,
    recentEntries: recentList,
  };
}

/** True when a parts object has nothing worth injecting. */
function isEmptyParts(p: StandingContext): boolean {
  return (
    !p.dailySummary &&
    p.themes.length === 0 &&
    p.patterns.length === 0 &&
    p.openQuestions.length === 0 &&
    p.recentEntries.length === 0
  );
}

/**
 * Compose the standing context into a compact, clearly-labeled block — the same
 * restrained framing as the RAG memory block (this is the person's own material;
 * read it for continuity, never recite it back, never interpret it). Returns ""
 * when there's nothing, so callers can branch on emptiness.
 *
 * Robust by construction: getStandingContextParts already swallows failures and
 * honors the budget, so this never throws for a slow or empty DB.
 */
export async function getStandingContext(
  userId: string,
  opts?: { budgetMs?: number },
): Promise<string> {
  let parts: StandingContext;
  try {
    parts = await getStandingContextParts(userId, opts);
  } catch {
    return "";
  }
  return formatStandingContext(parts);
}

/** Render the parts into the injectable block (separated so the opener can reuse
 * the same compact framing without a second DB round-trip). */
export function formatStandingContext(parts: StandingContext): string {
  if (isEmptyParts(parts)) return "";
  const sections: string[] = [];
  if (parts.dailySummary) {
    sections.push(`Most recent daily distillation:\n${parts.dailySummary}`);
  }
  if (parts.themes.length) {
    sections.push(`Recurring threads: ${parts.themes.join("; ")}`);
  }
  if (parts.patterns.length) {
    sections.push(`Patterns surfaced:\n${parts.patterns.map((p) => `- ${p}`).join("\n")}`);
  }
  if (parts.openQuestions.length) {
    sections.push(
      `Open questions:\n${parts.openQuestions.map((q) => `- ${q}`).join("\n")}`,
    );
  }
  if (parts.recentEntries.length) {
    sections.push(
      `Most recent notes:\n${parts.recentEntries.map((e) => `- ${e}`).join("\n")}`,
    );
  }
  return sections.join("\n\n");
}
