"use client";

// "Worth returning to" — the quietest, heaviest thing on /today. Socrates holds
// up a pattern across the person's own thinking and hands it back as an OPEN
// QUESTION for THEM to examine — never a verdict, never a count. Strictly
// anti-metric: no numbers, no "you've done X", no score. One rationed accent (the
// Press-on-this link), a hairline rule, a FIG. mono kicker — the Instrument.
//
// Dismissal is client-local (localStorage by pattern id) — no schema column, no
// migration. Dismissing hides a pattern on this browser; it isn't deleted, and a
// newer pattern will surface in its place next time the bank moves.

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

export type SurfacedPattern = {
  id: string;
  summary: string;
  /** First resolvable provenance entry id, for the /chat?from= seed flow. */
  seedEntryId: string | null;
};

const DISMISS_KEY = "socrates:patterns:dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    // best-effort; a full/blocked store just means it resurfaces — harmless.
  }
}

// Hydration-safe "are we on the client yet?" — server snapshot is false, client
// is true. Using useSyncExternalStore (rather than a setState-in-effect) keeps
// the first paint matching the server (nothing rendered) so a locally-dismissed
// pattern never flashes in before localStorage is read.
const emptySubscribe = () => () => {};

export function PatternsSurface({ patterns }: { patterns: SurfacedPattern[] }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  // Lazy-init from localStorage (client-side only — SSR returns the empty set via
  // the `typeof window` guard); never re-flashes once read.
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  if (!mounted) return null;

  const visible = patterns.filter((p) => !dismissed.has(p.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }

  return (
    <section className="border-t border-hairline py-9">
      <p className="label-mono mb-5">Worth returning to</p>
      <ul className="space-y-7">
        {visible.map((p) => (
          <li key={p.id} className="group/pattern flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-lg leading-relaxed text-marble text-pretty">
                {p.summary}
              </p>
              {p.seedEntryId ? (
                <Link
                  href={`/chat?from=${encodeURIComponent(p.seedEntryId)}`}
                  className="label-mono group mt-2 inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
                >
                  Press on this
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.6}
                  />
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(p.id)}
              aria-label="Set this aside"
              className="-mr-1 mt-1 shrink-0 rounded-sm p-1 text-marble-dim opacity-0 transition-opacity hover:text-marble focus-visible:opacity-100 group-hover/pattern:opacity-100"
            >
              <X className="size-4" strokeWidth={1.6} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
