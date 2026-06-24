// Today — the daily readout. A warm, quiet entry point in Socrates' voice: a
// greeting by time of day, today's distillation if there is one, a few recent
// thoughts, and a few quiet ways to think out loud (write, talk, or be called).
// This is an instrument for your own thinking — not a feed, not a scoreboard.
// No streaks, no counts-as-pressure, no "you're on a roll." Just an invitation.

import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ArrowRight, PenLine } from "lucide-react";
import { db } from "@/lib/db/client";
import { entries, patterns, summaries } from "@/lib/db/schema";
import type { Entry, Summary } from "@/lib/db/schema";
import { requireProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/button";
import { BlinkCursor } from "@/components/brand/wordmark";
import { CallMeNow } from "@/components/today/call-me-now";
import {
  PatternsSurface,
  type SurfacedPattern,
} from "@/components/today/patterns-surface";
import { SummaryMarkdown } from "@/components/summary/markdown";

export const dynamic = "force-dynamic";

/** The current hour (0–23) in an IANA zone; falls back to UTC on a bad zone. */
function localHour(timezone: string | null | undefined): number {
  const tz = timezone ?? "UTC";
  const read = (zone: string) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "2-digit",
        hour12: false,
      })
        .formatToParts(new Date())
        .find((p) => p.type === "hour")?.value,
    );
  let hour: number;
  try {
    hour = read(tz);
  } catch {
    hour = read("UTC");
  }
  if (hour === 24) hour = 0; // some engines report midnight as 24
  return Number.isNaN(hour) ? new Date().getUTCHours() : hour;
}

function greeting(
  name: string | null | undefined,
  timezone: string | null | undefined,
): string {
  const hour = localHour(timezone);
  const who = name?.trim() ? `, ${name.trim().split(/\s+/)[0]}` : "";
  if (hour < 5) return `Still up${who}?`;
  if (hour < 12) return `Morning${who}.`;
  if (hour < 17) return `Afternoon${who}.`;
  if (hour < 22) return `Evening${who}.`;
  return `Late one${who}.`;
}

function isToday(d: Date, timezone: string | null | undefined): boolean {
  // Compare calendar dates in the USER's timezone, not the server's (UTC on
  // Vercel) — otherwise "today's distillation" flips off at UTC midnight rather
  // than the person's local midnight.
  const tz = timezone ?? "UTC";
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(d) === fmt.format(new Date());
  } catch {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
}

/** "08:30" → "8:30" — a human, non-padded reading of a daily-call time. */
function readCallTime(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  return `${hour}:${m[2]}`;
}

const TYPE_LABEL: Record<string, string> = {
  idea: "idea",
  opinion: "opinion",
  feeling: "feeling",
  observation: "observation",
  question: "question",
  decision: "decision",
};

/** Pull the candidate entry ids out of a pattern's loosely-typed provenance. */
function provenanceEntryIds(provenance: unknown): string[] {
  if (!provenance || typeof provenance !== "object") return [];
  const ids = (provenance as { entryIds?: unknown }).entryIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((x): x is string => typeof x === "string");
}

function timeReadout(d: Date): string {
  return d
    .toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase();
}

export default async function TodayPage() {
  const { userId, profile } = await requireProfile();

  const [latestSummaryRows, recentEntries, openQuestions, recentPatterns] =
    await Promise.all([
      db
        .select()
        .from(summaries)
        .where(eq(summaries.userId, userId))
        .orderBy(desc(summaries.periodEnd))
        .limit(1),
      db
        .select()
        .from(entries)
        .where(eq(entries.userId, userId))
        .orderBy(desc(entries.createdAt))
        .limit(5),
      // a few recent open questions to revisit — not a backlog, just an invitation
      // to press on what you left half-asked (no resolution-tracking metric)
      db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, userId), eq(entries.type, "question")))
        .orderBy(desc(entries.createdAt))
        .limit(3),
      // the heaviest quiet move: patterns Socrates has held up across this
      // person's thinking — surfaced as open questions, never interpreted.
      db
        .select()
        .from(patterns)
        .where(eq(patterns.userId, userId))
        .orderBy(desc(patterns.surfacedAt))
        .limit(2),
    ]);

  // Resolve each pattern's first provenance entry that STILL exists and is the
  // person's, so "Press on this" seeds the existing /chat?from= flow with a real
  // entry (re-extraction can drop an old entry id). Patterns with nothing
  // resolvable still show — they just won't carry a seed link.
  const candidateSeedIds = Array.from(
    new Set(recentPatterns.flatMap((p) => provenanceEntryIds(p.provenance))),
  );
  const resolvableSeedIds =
    candidateSeedIds.length > 0
      ? new Set(
          (
            await db
              .select({ id: entries.id })
              .from(entries)
              .where(
                and(
                  eq(entries.userId, userId),
                  inArray(entries.id, candidateSeedIds),
                ),
              )
          ).map((r) => r.id),
        )
      : new Set<string>();

  const surfacedPatterns: SurfacedPattern[] = recentPatterns.map((p) => ({
    id: p.id,
    summary: p.summary,
    seedEntryId:
      provenanceEntryIds(p.provenance).find((id) => resolvableSeedIds.has(id)) ??
      null,
  }));

  const latestSummary: Summary | undefined = latestSummaryRows[0];
  const todaysSummary =
    latestSummary && isToday(new Date(latestSummary.periodEnd), profile.timezone)
      ? latestSummary
      : undefined;

  const hasAnything = Boolean(todaysSummary) || recentEntries.length > 0;

  // the standing daily call, said plainly in Socrates' voice — not a countdown,
  // not a metric; just an honest line about what's arranged, with a way to change
  // it. "On" requires both a set time (dailyCallTime non-null = enabled) and a
  // phone to reach; otherwise calls are off.
  const callTime = readCallTime(profile.dailyCallTime);
  const hasPhone = Boolean(profile.phoneE164?.trim());
  const dailyOn = Boolean(callTime && hasPhone);
  const dailyCallLine = dailyOn
    ? `I'll call you around ${callTime} your time, most days.`
    : "Daily calls are off.";

  return (
    <div className="mx-auto max-w-3xl">
      {/* greeting + the quiet ways to think out loud */}
      <section className="pb-10">
        <p className="label-mono mb-3">
          {new Date()
            .toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
            .toUpperCase()}
        </p>
        {/* the page's one accent: the prompt + cursor — an instrument waiting
            for your thinking, not a voice waiting to talk */}
        <h1 className="flex items-baseline font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
          <span aria-hidden className="mr-3 text-accent">
            &rsaquo;
          </span>
          <span>{greeting(profile.displayName, profile.timezone)}</span>
          <BlinkCursor />
        </h1>
        <p className="mt-4 font-sans text-lg leading-relaxed text-marble-dim text-pretty">
          What are you working out? Set it down half-formed — I&apos;ll engage
          it, press on the reasoning, and surface what sharpens it. The thinking
          stays yours.
        </p>

        <div className="mt-7 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
          <LinkButton href="/chat" variant="outline" size="lg">
            <PenLine className="size-4" strokeWidth={1.6} />
            Write
          </LinkButton>
          <LinkButton href="/talk" variant="ghost" size="lg">
            Talk it through
          </LinkButton>
          <CallMeNow phone={profile.phoneE164} hasPhone={hasPhone} />
        </div>

        {/* the standing daily call, stated honestly, with a quiet door to edit it */}
        <p className="mt-5 font-sans text-sm leading-relaxed text-marble-dim">
          {dailyCallLine}{" "}
          <Link
            href="/onboarding"
            className="text-marble underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            {dailyOn ? "Change it" : "Set it up"}
          </Link>
        </p>
      </section>

      {/* today's distillation — clean reading */}
      {todaysSummary ? (
        <section className="hairline-x border-t border-hairline py-9">
          <p className="label-mono mb-4">FIG.01 · Today, distilled</p>
          <SummaryMarkdown content={todaysSummary.content} />
        </section>
      ) : null}

      {/* worth returning to — patterns Socrates held up across your thinking,
          handed back as open questions for YOU to examine (never interpreted).
          Quiet, dismissible, anti-metric: no counts, no scores. */}
      {surfacedPatterns.length > 0 ? (
        <PatternsSurface patterns={surfacedPatterns} />
      ) : null}

      {/* recent thoughts — a precise plotted list */}
      {recentEntries.length > 0 ? (
        <section className="border-t border-hairline py-9">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="label-mono">Lately, in your own words</p>
            <Link
              href="/bank"
              className="label-mono inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
            >
              the bank
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
          <ul className="space-y-6">
            {recentEntries.map((e: Entry) => (
              <li key={e.id} className="group">
                <p className="label-mono mb-1.5">
                  {TYPE_LABEL[e.type] ?? e.type} ·{" "}
                  {timeReadout(new Date(e.createdAt))}
                </p>
                <p className="font-sans text-lg leading-relaxed text-marble text-pretty">
                  {e.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* still open — a quiet way back into the questions you left half-asked.
          Each one carries into thinking (the same close-the-loop the bank uses).
          Not a backlog, not a count to clear — just an invitation to press on. */}
      {openQuestions.length > 0 ? (
        <section className="border-t border-hairline py-9">
          <p className="label-mono mb-5">Still open</p>
          <ul className="space-y-6">
            {openQuestions.map((q: Entry) => (
              <li key={q.id}>
                <p className="font-sans text-lg leading-relaxed text-marble text-pretty">
                  {q.content}
                </p>
                <Link
                  href={`/chat?from=${encodeURIComponent(q.id)}`}
                  className="label-mono group mt-2 inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
                >
                  Press on this
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.6}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* empty state — an invitation, never a scold; decoupled from voice */}
      {!hasAnything ? (
        <section className="border-t border-hairline py-12">
          <p className="max-w-md font-sans text-lg leading-relaxed text-marble-dim text-pretty">
            Nothing here yet. The first time you think out loud here — written or
            spoken — your thoughts start collecting: a record of your mind as it
            moves. Begin whenever something&apos;s working at you.
          </p>
        </section>
      ) : null}
    </div>
  );
}
