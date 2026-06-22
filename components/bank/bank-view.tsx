"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, List, X } from "lucide-react";
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

type Mode = "sky" | "list";

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

// Brightness from recency × theme recurrence — recent and recurring thoughts
// shine brighter. Structural, not decorative.
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
  const [mode, setMode] = useState<Mode>("sky");
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

  const topThemes = useMemo(
    () => [...themes].sort((a, b) => b.entryCount - a.entryCount).slice(0, 10),
    [themes],
  );

  if (entries.length === 0) {
    return (
      <div className="border-t border-hairline py-16">
        <p className="max-w-md font-serif text-lg leading-relaxed text-marble-dim text-pretty">
          Nothing here yet. The first time we talk, each thought you work out
          becomes a star — and over time, your sky fills in.
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
          aria-label="View the bank as a sky or a list"
        >
          <ToggleButton
            active={mode === "sky"}
            onClick={() => setMode("sky")}
            icon={<Sparkles className="size-3.5" strokeWidth={1.6} />}
            label="sky"
          />
          <ToggleButton
            active={mode === "list"}
            onClick={() => setMode("list")}
            icon={<List className="size-3.5" strokeWidth={1.6} />}
            label="list"
          />
        </div>
        <span className="label-mono text-marble-dim">
          {entries.length} {entries.length === 1 ? "thought" : "thoughts"}
          {topThemes.length
            ? ` · ${topThemes.length} ${topThemes.length === 1 ? "thread" : "threads"}`
            : ""}
        </span>
      </div>

      {mode === "sky" ? (
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
                className="mt-5 rounded-lg border border-hairline-strong bg-raised p-5"
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
                <p className="mt-3 font-serif text-xl leading-relaxed text-marble text-pretty">
                  {selected.content}
                </p>
                {selected.themes?.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {selected.themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-xs tracking-wide text-cyan"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 font-serif text-sm text-marble-dim"
              >
                Each star is a thought. Lines connect what recurs. Select one to
                read it.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="mt-6">
          {/* search */}
          <div className="relative mb-7 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marble-dim"
              strokeWidth={1.6}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your thoughts and threads…"
              aria-label="Search your thoughts"
              className="h-10 w-full rounded-sm border border-hairline bg-raised pl-9 pr-3 font-sans text-sm text-marble placeholder:text-marble-dim focus:border-hairline-strong focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="font-serif text-marble-dim">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="space-y-10">
              {grouped.map((group) => (
                <section key={group.day}>
                  <p className="label-mono mb-4">{group.day}</p>
                  <ul className="space-y-6">
                    {group.items.map((e) => (
                      <li key={e.id}>
                        <p className="label-mono mb-1.5 flex items-center gap-1.5">
                          <span aria-hidden>{TYPE_GLYPH[e.type]}</span>
                          {e.type} · {timeReadout(e.createdAt)}
                        </p>
                        <p className="font-serif text-lg leading-relaxed text-marble text-pretty">
                          {e.content}
                        </p>
                        {e.themes?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {e.themes.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setQuery(t)}
                                className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-xs tracking-wide text-cyan transition-colors hover:border-hairline-strong hover:text-cyan"
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        ) : null}
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
      className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
        active
          ? "bg-raised-2 text-cyan"
          : "text-marble-dim hover:text-marble"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
