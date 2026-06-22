"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";

export type StarState =
  | "idle"
  | "listening"
  | "speaking"
  | "thinking"
  | "ended";

type Props = {
  state?: StarState;
  /** 0..1 live audio amplitude — used gently, never as a VU meter */
  level?: number;
  /** diameter in px */
  size?: number;
  className?: string;
};

// Per-state character of the breathing wave. Calm by design — presence, not metering.
const WAVE: Record<StarState, { dur: number; bright: number; amp: number }> = {
  idle: { dur: 5.4, bright: 0.62, amp: 1 },
  listening: { dur: 3.6, bright: 0.92, amp: 1.05 },
  speaking: { dur: 2.3, bright: 1, amp: 1.12 },
  thinking: { dur: 7, bright: 0.42, amp: 0.7 },
  ended: { dur: 6, bright: 0.28, amp: 0.6 },
};

const N = 9; // grid is N×N
const C = (N - 1) / 2;
const R = 4.45; // radius (in cells) — clips the square lattice into an orb

type Dot = { r: number; c: number; dist: number };

/**
 * Socrates' presence — a dot-matrix orb. A round lattice of dots that breathes
 * in a calm wave rippling out from the center; state changes the rhythm and
 * brightness. Never a VU meter. Echoes the dot-matrix bust + field.
 * API preserved (BreathingStar / StarState) so all callers are untouched.
 */
export function BreathingStar({
  state = "idle",
  level = 0,
  size = 160,
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const cfg = WAVE[state];
  const amp = Math.max(0, Math.min(1, level));

  const dots = useMemo<Dot[]>(() => {
    const out: Dot[] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const dist = Math.hypot(r - C, c - C);
        if (dist > R) continue;
        out.push({ r, c, dist });
      }
    }
    return out;
  }, []);

  const dotPx = size * 0.072;
  const scale = cfg.amp + amp * 0.06;

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        transform: `scale(${scale})`,
        opacity: cfg.bright,
        transition: "opacity 0.6s var(--ease-instrument)",
      }}
      role="img"
      aria-label={`Socrates is ${state === "ended" ? "resting" : state}`}
    >
      {dots.map(({ r, c, dist }) => {
        // static brightness (radial falloff) — also the reduced-motion view
        const base = (1 - dist / R) * 0.6 + 0.3;
        const delay = -(dist * 0.26); // negative → wave already in motion, ripples out
        return (
          <span
            key={`${r}-${c}`}
            className="absolute rounded-full"
            style={{
              left: `${(c / (N - 1)) * 100}%`,
              top: `${(r / (N - 1)) * 100}%`,
              width: dotPx,
              height: dotPx,
              marginLeft: -dotPx / 2,
              marginTop: -dotPx / 2,
              background: "var(--accent)",
              opacity: base,
              animation: reduce
                ? undefined
                : `dot-wave ${cfg.dur}s var(--ease-instrument) ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
