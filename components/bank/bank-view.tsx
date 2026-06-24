"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Grid3x3, List, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Constellation } from "@/components/sky/constellation";
import {
  TYPE_GLYPH,
  type EntryType,
  type SkyStar,
} from "@/lib/constellation";

// One entry, as the bank page hands it to the client (dates serialized).
export type BankEntry = {
  id: string;
  type: EntryType;
  content: string;
  themes: string[] | null;
  createdAt: string;
};

export type BankTheme = {
  label: string;
  entryCount: number;
};

type Mode = "field" | "list";

function timeReadout(iso: string): string {
  return new Date(iso)
    .toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

// Weight from recency × theme recurrence — recent and recurring thoughts plot
// larger and brighter. Structural, not decorative.
function computeStars(entries: BankEntry[]): SkyStar[] {
  if (entries.length === 0) return [];
  const times = entries.map((e) => new Date(e.createdAt).getTime());
  const newest = Math.max(...times);
  const oldest = Math.min(...times);
  const span = Math.max(1, newest - oldest);

  const themeFreq = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.themes ?? []) {
      themeFreq.set(t, (themeFreq.get(t) ?? 0) + 1);
    }
  }

  return entries.map((e) => {
    const recency = (new Date(e.createdAt).getTime() - oldest) / span; // 0..1
    const recurrence = Math.min(
      1,
      (e.themes ?? []).reduce(
        (acc, t) => Math.max(acc, (themeFreq.get(t) ?? 1) / 4),
        0,
      ),
    );
    const brightness = 0.35 + recency * 0.45 + recurrence * 0.2;
    return {
      id: e.id,
      type: e.type,
      content: e.content,
      themes: e.themes ?? undefined,
      brightness: Math.max(0.2, Math.min(1, brightness)),
      createdAt: e.createdAt,
    };
  });
}

export function BankView({
  entries,
  themes,
}: {
  entries: BankEntry[];
  themes: BankTheme[];
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("field");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const stars = useMemo(() => computeStars(entries), [entries]);
  const byId = useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries],
  );
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.content.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.themes ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  // Group filtered entries by day (already newest-first from the server).
  const grouped = useMemo(() => {
    const groups: { day: string; items: BankEntry[] }[] = [];
    for (const e of filtered) {
      const day = dayLabel(e.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(e);
      else groups.push({ day, items: [e] });
    }
    return groups;
  }, [filtered]);

  if (entries.length === 0) {
    return (
      <div className="border-t border-hairline py-16">
        <p className="max-w-md font-sans text-lg leading-relaxed text-marble-dim text-pretty">
          Nothing here yet. The first thought you work out here — written or
          spoken — plots a point in the field, and over time the shape of your
          thinking emerges.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* toggle + quiet readout */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
        <div
          className="inline-flex rounded-md border border-hairline p-0.5"
          role="tablist"
          aria-label="View the bank as a field or a list"
        >
          <ToggleButton
            active={mode === "field"}
            onClick={() => setMode("field")}
            icon={<Grid3x3 className="size-3.5" strokeWidth={1.6} />}
            label="field"
          />
          <ToggleButton
            active={mode === "list"}
            onClick={() => setMode("list")}
            icon={<List className="size-3.5" strokeWidth={1.6} />}
            label="list"
          />
        </div>
        {/* no tally — the bank is not a scoreboard (SPEC §9 anti-metric law) */}
        <span className="label-mono text-marble-dim">the field</span>
      </div>

      {mode === "field" ? (
        <div className="mt-6">
          <Constellation
            stars={stars}
            selectedId={selectedId}
            onSelect={(s) => setSelectedId(s.id)}
          />
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                className="mt-5 rounded-md border border-hairline bg-raised p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="label-mono flex items-center gap-1.5">
                    <span aria-hidden>{TYPE_GLYPH[selected.type]}</span>
                    {selected.type} · {timeReadout(selected.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close"
                    className="-m-1 rounded-sm p-1 text-marble-dim transition-colors hover:text-marble"
                  >
                    <X className="size-4" strokeWidth={1.6} />
                  </button>
                </div>
                <p className="mt-3 font-sans text-xl leading-relaxed text-marble text-pretty">
                  {selected.content}
                </p>
                {selected.themes?.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {selected.themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-sm border border-hairline px-2 py-0.5 font-mono-display text-xs tracking-wide text-marble-dim"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {/* close the loop — carry this banked thought back into thinking */}
                <div className="mt-5 border-t border-hairline pt-4">
                  <PressOnThis entryId={selected.id} />
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 font-sans text-sm text-marble-dim"
              >
                Each dot is a thought. Rules connect what recurs. Select one to
                read it.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="mt-6">
          {/* search — terminal cue, on a single hairline rule */}
          <div className="relative mb-8 max-w-md border-b border-hairline focus-within:border-accent">
            <Search
              className="pointer-events-none absolute left-1 top-1/2 size-4 -translate-y-1/2 text-marble-dim"
              strokeWidth={1.6}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your thoughts and threads…"
              aria-label="Search your thoughts"
              className="h-10 w-full rounded-sm bg-transparent pl-7 pr-3 font-sans text-sm text-marble placeholder:text-marble-dim focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="font-sans text-marble-dim">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="border-t border-hairline">
              {grouped.map((group) => (
                <section
                  key={group.day}
                  className="border-b border-hairline py-7 first:pt-7"
                >
                  <p className="label-mono mb-5">{group.day}</p>
                  <ul className="space-y-7">
                    {group.items.map((e) => (
                      <li key={e.id} className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                        <p className="label-mono flex items-center gap-1.5 sm:pt-1">
                          <span aria-hidden>{TYPE_GLYPH[e.type]}</span>
                          {e.type} · {timeReadout(e.createdAt)}
                        </p>
                        <div>
                          <p className="font-sans text-lg leading-relaxed text-marble text-pretty">
                            {e.content}
                          </p>
                          {e.themes?.length ? (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {e.themes.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setQuery(t)}
                                  className="rounded-sm border border-hairline px-2 py-0.5 font-mono-display text-xs tracking-wide text-marble-dim transition-colors hover:border-accent hover:text-accent"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-3">
                            <PressOnThis entryId={e.id} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// A quiet hairline action that carries a banked thought back into thinking. The
// seed is resolved server-side on /chat from the entry id (never client text).
// Deliberately mono + dim so the single rationed accent stays on the field/card.
function PressOnThis({ entryId }: { entryId: string }) {
  return (
    <Link
      href={`/chat?from=${encodeURIComponent(entryId)}`}
      className="label-mono group inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
    >
      Press on this
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        &rarr;
      </span>
    </Link>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono-display text-xs uppercase tracking-[0.12em] transition-colors ${
        active
          ? "bg-raised-2 text-accent-strong"
          : "text-marble-dim hover:text-marble"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
