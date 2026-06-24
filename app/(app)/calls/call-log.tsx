"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Mic, ChevronDown } from "lucide-react";
import { renderRecap } from "@/components/recap/render-recap";
import { PageHeader } from "@/components/ui/page-header";

export type CallTurn = { role: "user" | "socrates"; text: string };
export type CallEntry = { type: string; content: string; themes: string[] };
export type CallLogItem = {
  id: string;
  type: "scheduled_call" | "on_demand_voice";
  startedAt: string; // ISO
  durationSecs: number | null;
  summary: string | null;
  entries: CallEntry[];
  turns: CallTurn[];
};

const TYPE_LABEL: Record<string, string> = {
  decision: "Decision",
  question: "Question",
  idea: "Idea",
  opinion: "Opinion",
  observation: "Observation",
  feeling: "Feeling",
};
// The order things surface in the log — decisions and open questions first.
const TYPE_ORDER = [
  "decision",
  "question",
  "idea",
  "opinion",
  "observation",
  "feeling",
];

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDuration(secs: number | null): string | null {
  if (secs == null || secs <= 0) return null;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function orderedEntries(entries: CallEntry[]): CallEntry[] {
  return [...entries].sort(
    (a, b) =>
      (TYPE_ORDER.indexOf(a.type) + 1 || 99) -
      (TYPE_ORDER.indexOf(b.type) + 1 || 99),
  );
}

function uniqueThemes(entries: CallEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) for (const t of e.themes) if (t) set.add(t);
  return [...set].slice(0, 12);
}

export function CallLog({ items }: { items: CallLogItem[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        className="mb-10 border-b border-hairline pb-6"
        kicker="Calls & voice"
        title="Every call, kept."
        intro="What you talked through, surfaced and set down — a quiet summary, the thoughts that came up in your own words, and the full transcript if you want it. Never a score; just the record of your thinking."
      />

      {items.length === 0 ? (
        <section className="rounded-md border border-hairline bg-raised p-8 sm:p-10">
          <p className="label-mono mb-4">No calls on file yet</p>
          <p className="text-pretty font-sans text-lg leading-relaxed text-marble">
            Once you talk something through &mdash; in the browser or over the
            phone &mdash; each conversation lands here, distilled.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {items.map((c) => (
            <CallCard key={c.id} call={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CallCard({ call }: { call: CallLogItem }) {
  const [open, setOpen] = useState(false);
  const isPhone = call.type === "scheduled_call";
  const entries = orderedEntries(call.entries);
  const themes = uniqueThemes(call.entries);
  const duration = fmtDuration(call.durationSecs);

  return (
    <article className="rounded-md border border-hairline bg-raised p-6 sm:p-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="label-mono flex items-center gap-1.5 text-marble-dim">
            {isPhone ? (
              <Phone className="size-3.5" strokeWidth={1.8} />
            ) : (
              <Mic className="size-3.5" strokeWidth={1.8} />
            )}
            {isPhone ? "Phone call" : "Voice · web"}
          </p>
          <p className="mt-1.5 font-sans text-marble">{fmtWhen(call.startedAt)}</p>
        </div>
        {duration && <p className="label-mono text-marble-dim">{duration}</p>}
      </header>

      {/* summary */}
      <div className="mt-5 border-t border-hairline pt-5">
        <p className="label-mono mb-3 text-marble-dim">&rsaquo; summary</p>
        {call.summary ? (
          <div className="text-[0.95rem]">{renderRecap(call.summary)}</div>
        ) : (
          <p className="font-sans text-sm text-marble-dim">
            Nothing distilled from this one &mdash; the line was brief.
          </p>
        )}
      </div>

      {/* what surfaced — the atomic thoughts, organized by kind */}
      {entries.length > 0 && (
        <div className="mt-5 border-t border-hairline pt-5">
          <p className="label-mono mb-3 text-marble-dim">&rsaquo; what surfaced</p>
          <ul className="space-y-3.5">
            {entries.map((e, i) => (
              <li key={i}>
                <p className="label-mono mb-1 text-marble-dim">
                  {TYPE_LABEL[e.type] ?? e.type}
                </p>
                <p className="text-pretty font-sans leading-relaxed text-marble">
                  {e.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* themes — the threads this call touched */}
      {themes.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {themes.map((t) => (
            <span
              key={t}
              className="label-mono rounded-sm border border-hairline px-2 py-0.5 text-marble-dim"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* transcript — collapsed by default */}
      {call.turns.length > 0 && (
        <div className="mt-5 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="label-mono inline-flex items-center gap-1.5 rounded-sm text-marble-dim transition-colors hover:text-marble"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              strokeWidth={1.8}
            />
            {open ? "Hide" : "Show"} transcript ({call.turns.length})
          </button>
          {open && (
            <div className="mt-4 space-y-3.5">
              {call.turns.map((t, i) => (
                <div key={i}>
                  <p
                    className={`label-mono mb-0.5 ${
                      t.role === "socrates" ? "text-accent" : "text-marble-dim"
                    }`}
                  >
                    {t.role === "socrates" ? "Socrates" : "You"}
                  </p>
                  <p className="text-pretty font-sans text-[0.95rem] leading-relaxed text-marble">
                    {t.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* close the loop — carry this call back into thinking. Seeded server-side
          on /chat from this session's summary (never client text). Only offered
          when there's something distilled to press on. */}
      {call.summary ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <Link
            href={`/chat?fromCall=${encodeURIComponent(call.id)}`}
            className="label-mono group inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
          >
            Take this further in writing
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              &rarr;
            </span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}
