// Today — the daily landing. A warm, quiet entry point in Socrates' voice: a
// greeting by time of day, today's distillation if there is one, a few recent
// thoughts, and the two ways to start a session (call you, or talk in-browser).
// No streaks, no counts-as-pressure, no "you're on a roll." Just an invitation.

import { desc, eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db/client";
import { entries, summaries } from "@/lib/db/schema";
import type { Entry, Summary } from "@/lib/db/schema";
import { requireProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/button";
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

  return (
    <div className="mx-auto max-w-3xl">
      {/* greeting + the two ways to begin */}
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
        <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-marble sm:text-5xl">
          {greeting(profile.displayName)}
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-marble-dim text-pretty">
          What&apos;s on your mind? Say it out loud, half-formed — I&apos;ll ask
          the questions.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-start">
          <CallMeNow phone={profile.phoneE164} />
          <LinkButton href="/talk" variant="outline" size="lg">
            Talk now
          </LinkButton>
        </div>
      </section>

      {/* today's distillation */}
      {todaysSummary ? (
        <section className="hairline-x border-t border-hairline py-9">
          <p className="label-mono mb-4">Today · distilled</p>
          <SummaryMarkdown content={todaysSummary.content} />
        </section>
      ) : null}

      {/* recent thoughts */}
      {recentEntries.length > 0 ? (
        <section className="border-t border-hairline py-9">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="label-mono">Lately</p>
            <a
              href="/bank"
              className="label-mono inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-cyan"
            >
              the bank
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </a>
          </div>
          <ul className="space-y-6">
            {recentEntries.map((e: Entry) => (
              <li key={e.id} className="group">
                <p className="label-mono mb-1.5">
                  {TYPE_LABEL[e.type] ?? e.type} ·{" "}
                  {timeReadout(new Date(e.createdAt))}
                </p>
                <p className="font-serif text-lg leading-relaxed text-marble text-pretty">
                  {e.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* empty state — an invitation, never a scold */}
      {!hasAnything ? (
        <section className="border-t border-hairline py-12">
          <p className="max-w-md font-serif text-lg leading-relaxed text-marble-dim text-pretty">
            Nothing here yet. The first time we talk, your thoughts start
            collecting here — a record of your mind as it moves. Begin whenever
            something&apos;s on your mind.
          </p>
        </section>
      ) : null}
    </div>
  );
}
