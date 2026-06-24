"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// The vertical "selector wheel" of things Socrates is a midwife FOR. The fixed
// prefix ("The midwife for ") lives in the hero; this renders only the cycling
// clause. The first item is rendered deterministically on the server so SSR and
// the first client paint agree — the shuffle and the cycling begin in an effect,
// after mount.
//
// Motion is carried the project way: opacity + scale + a smooth translateY of
// each row toward its target slot — no per-letter tricks, no new @keyframes
// (transitions live in-component). Under prefers-reduced-motion we cross-fade in
// place instead of scrolling the wheel.

// Many, deliberate, on-brand phrases. Maieutic / the examined life /
// anti-answer-engine / your-own-cognition. The first entry is the stable SSR
// anchor before the client shuffle lands.
const PHRASES = [
  "human cognition",
  "your own thinking",
  "the thought you can't quite name",
  "your midnight catharsis",
  "your shower thoughts",
  "the birth of an idea",
  "your half-formed hunches",
  "the argument with yourself",
  "what you actually believe",
  "your unfinished reasoning",
  "the examined life",
  "the question under the question",
  "your 2am clarity",
  "thinking you can call your own",
  "the idea you didn't know you were carrying",
  "your better second thought",
  "the hunch you keep circling back to",
  "the doubt worth keeping",
  "your own slow conclusions",
  "the mind talking to itself",
] as const;

// Rows rendered above and below the centred phrase (~1.5 each side; we keep 2
// and let opacity taper the outer ones). More rows than strictly visible keeps
// the wheel populated through a slide.
const NEIGHBORS = 2;
const INTERVAL_MS = 4000;
// Row height in em — must match the rendered line-height so a one-row slide
// lands the next phrase exactly on centre. We pin both to this value.
const ROW_EM = 1.6;
// The masked viewport is taller than one row so the neighbouring phrases above
// and below are actually visible (~1.5 each side), like a selector wheel. The
// centre row still sits on the vertical middle, aligned to the fixed prefix.
const VIEW_EM = ROW_EM * 3;

// Fisher–Yates, seeded by Math.random at mount (client-only) so SSR and first
// paint never disagree: SSR shows PHRASES[0]; the shuffled order arrives after.
function shuffle<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function PhraseCycler({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  // Stable for SSR + first paint; the effect swaps in a shuffled order.
  const [order, setOrder] = useState<readonly string[]>(PHRASES);
  const [index, setIndex] = useState(0);
  // Hold transitions off for the first committed frame so the wheel doesn't
  // animate in from an offset on load.
  const [armed, setArmed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: SSR
    // renders the stable PHRASES[0]; the shuffle is client-only and must land
    // post-mount, otherwise server and first client paint disagree (hydration).
    setOrder(shuffle(PHRASES));
    setIndex(0);
    started.current = true;
    const raf = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!started.current) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % order.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [order.length]);

  // A fixed set of rows, each pinned to an absolute offset around the centre.
  // As `index` advances, every row recomputes its offset (with wraparound) and
  // transitions toward it — the whole stack appears to scroll up one notch.
  const rows = useMemo(() => {
    const n = order.length;
    const out: { key: number; text: string; offset: number }[] = [];
    for (let offset = -NEIGHBORS; offset <= NEIGHBORS; offset++) {
      const i = (((index + offset) % n) + n) % n;
      out.push({ key: i, text: order[i], offset });
    }
    return out;
  }, [order, index]);

  // Reduced motion: no wheel — show the centred phrase and let opacity cross-
  // fade as `index` changes (key on the text forces a fresh fade-rise).
  if (reduce) {
    return (
      <span
        className={`relative inline-flex overflow-hidden align-bottom ${className}`}
        style={{ height: `${ROW_EM}em` }}
        aria-live="polite"
      >
        <span
          key={order[index]}
          className="block animate-[fade-rise_0.5s_var(--ease-instrument)_both] font-medium text-marble"
          style={{ lineHeight: `${ROW_EM}` }}
        >
          {order[index]}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block overflow-hidden align-middle ${className}`}
      style={{
        height: `${VIEW_EM}em`,
        // taper the rim so the neighbouring phrases dissolve toward the edges
        // like an iOS picker — solid only through the centre row.
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, #000 38%, #000 62%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, #000 38%, #000 62%, transparent 100%)",
      }}
    >
      {/* announce only the centred phrase to assistive tech; the wheel rows
          are decorative duplicates and stay hidden. */}
      <span className="sr-only" aria-live="polite">
        {order[index]}
      </span>
      {/* the centre line, at the vertical middle of the viewport */}
      <span
        aria-hidden
        className="absolute inset-x-0"
        style={{ top: "50%" }}
      >
        {rows.map((row) => {
          const dist = Math.abs(row.offset);
          const centred = row.offset === 0;
          // taper: full at centre, then fall away with distance.
          const opacity = centred ? 1 : dist === 1 ? 0.32 : 0.12;
          const scale = centred ? 1 : dist === 1 ? 0.94 : 0.86;
          return (
            <span
              key={row.key}
              className={`absolute inset-x-0 block whitespace-nowrap ${
                centred
                  ? "font-medium text-marble"
                  : "font-light text-marble-dim"
              }`}
              style={{
                height: `${ROW_EM}em`,
                lineHeight: `${ROW_EM}`,
                // each row sits `offset` rows from centre; -50% pulls its own
                // half-height back so the centre row is vertically centred.
                top: 0,
                transform: `translateY(calc(${row.offset * ROW_EM}em - 50%)) scale(${scale})`,
                transformOrigin: "left center",
                opacity,
                transition: armed
                  ? "transform 0.6s var(--ease-instrument), opacity 0.6s var(--ease-instrument)"
                  : "none",
              }}
            >
              {row.text}
            </span>
          );
        })}
      </span>
    </span>
  );
}
