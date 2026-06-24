// Today — the daily readout. A warm, quiet entry point in Socrates' voice: a
// greeting by time of day, today's distillation if there is one, a few recent
// thoughts, and a few quiet ways to think out loud (write, talk, or be called).
// This is an instrument for your own thinking — not a feed, not a scoreboard.
// No streaks, no counts-as-pressure, no "you're on a roll." Just an invitation.

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, PenLine } from "lucide-react";
import { db } from "@/lib/db/client";
import { entries, summaries } from "@/lib/db/schema";
import type { Entry, Summary } from "@/lib/db/schema";
import { requireProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/button";
import { BlinkCursor } from "@/components/brand/wordmark";
import { CallMeNow } from "@/components/today/call-me-now";
import { SummaryMarkdown } from "@/components/summary/markdown";

export const dynamic = "force-dynamic";

function greeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const who = name?.trim() ? `, ${name.trim().split(/\s+/)[0]}` : "";
  if (hour < 5) return `Still up${who}?`;
  if (hour < 12) return `Morning${who}.`;
  if (hour < 17) return `Afternoon${who}.`;
  if (hour < 22) return `Evening${who}.`;
  return `Late one${who}.`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

  const [latestSummaryRows, recentEntries] = await Promise.all([
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
  ]);

  const latestSummary: Summary | undefined = latestSummaryRows[0];
  const todaysSummary =
    latestSummary && isToday(new Date(latestSummary.periodEnd))
      ? latestSummary
      : undefined;

  const hasAnything = Boolean(todaysSummary) || recentEntries.length > 0;

  // the standing daily call, said plainly in Socrates' voice — not a countdown,
  // not a metric; just an honest line about what's arranged, with a way to change it
  const callTime = readCallTime(profile.dailyCallTime);
  const hasPhone = Boolean(profile.phoneE164?.trim());
  const dailyCallLine =
    callTime && hasPhone
      ? `I'll call you around ${callTime} your time.`
      : "Daily calls are off for now.";

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
        <h1 className="flex items-baseline font-display text-4xl font-light leading-tight tracking-tight text-marble sm:text-5xl">
          <span aria-hidden className="mr-3 text-accent">
            &rsaquo;
          </span>
          <span>{greeting(profile.displayName)}</span>
          <BlinkCursor />
        </h1>
        <p className="mt-4 max-w-xl font-sans text-lg leading-relaxed text-marble-dim text-pretty">
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
            {callTime && hasPhone ? "Change it" : "Set it up"}
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
