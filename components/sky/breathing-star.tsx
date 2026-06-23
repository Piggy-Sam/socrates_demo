"use client";

import { useEffect, useRef } from "react";
import { wave, mix, rgba, readRGBVar, type RGB } from "@/lib/dots";

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

// Per-state character. Each is visibly distinct (see energy() below).
const CHAR: Record<StarState, { bright: number; scale: number }> = {
  idle: { bright: 0.85, scale: 0.95 },
  listening: { bright: 1, scale: 1.0 },
  speaking: { bright: 1, scale: 1.06 },
  thinking: { bright: 0.62, scale: 0.9 },
  ended: { bright: 0.42, scale: 0.84 },
};

const N = 11;
const C = (N - 1) / 2;
const RGRID = 5.2;

// energy 0..1 for a dot at normalized radius rr and grid pos (gx,gy) at time t
function energy(
  state: StarState,
  rr: number,
  gx: number,
  gy: number,
  t: number,
): number {
  let e: number;
  switch (state) {
    case "listening": // receptive — waves ripple INWARD, alert & bright
      e = 0.55 + 0.45 * Math.sin(rr * 7 + t * 3.0);
      break;
    case "speaking": // energy OUT — concentric rings emanate outward, lively
      e =
        0.5 +
        0.35 * Math.sin(rr * 9 - t * 5.2) +
        0.18 * Math.sin(rr * 16 - t * 8);
      break;
    case "thinking": // searching — turbulent, non-radial shimmer, dim
      e = 0.32 + 0.34 * wave(gx * 0.9, gy * 0.9, t * 0.9) +
        0.12 * Math.sin(rr * 3 - t * 0.8);
      break;
    case "ended": // settling — low, slow, nearly still
      e = 0.3 + 0.12 * Math.sin(t * 0.7 - rr * 2);
      break;
    default: // idle — calm radial breathing
      e = 0.46 + 0.4 * Math.sin(rr * 5.5 - t * 1.25);
  }
  return Math.max(0, Math.min(1, e));
}

/**
 * Socrates' presence — a dot-matrix orb on canvas. Always alive, with a truly
 * distinct rhythm per state (idle breathes · listening ripples inward ·
 * speaking emanates outward · thinking searches · ended settles). Shares the
 * dot-matrix DNA. API preserved so all callers are untouched.
 */
export function BreathingStar({
  state = "idle",
  level = 0,
  size = 160,
  className = "",
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(level);
  stateRef.current = state;
  levelRef.current = Math.max(0, Math.min(1, level));

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    const start = performance.now();
    let accent: RGB = [77, 124, 255];
    const readColors = () => {
      accent = readRGBVar("--accent-rgb", accent);
    };

    const cells: { gx: number; gy: number; rr: number }[] = [];
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const dist = Math.hypot(i - C, j - C);
        if (dist > RGRID) continue;
        cells.push({ gx: i, gy: j, rr: dist / RGRID });
      }

    const setup = () => {
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (t: number) => {
      const st = stateRef.current;
      const lvl = levelRef.current;
      const ch = CHAR[st];
      ctx.clearRect(0, 0, size, size);
      const step = (size * 0.84) / (N - 1);
      const ox = size / 2 - C * step * ch.scale;
      const oy = size / 2 - C * step * ch.scale;
      const baseR = size * 0.026;
      const lit = mix(accent, [255, 255, 255], 0.35);

      for (const { gx, gy, rr } of cells) {
        const e = energy(st, rr, gx, gy, t);
        const x = ox + gx * step * ch.scale;
        const y = oy + gy * step * ch.scale;
        const boost = (st === "speaking" || st === "listening") ? lvl * 0.2 : 0;
        const radius = baseR * (0.4 + 1.05 * e) * ch.scale;
        const alpha = Math.min(1, (0.18 + 0.82 * e) * ch.bright + boost);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 6.2832);
        ctx.fillStyle = rgba(mix(accent, lit, e * 0.4), alpha);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      frame((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    // pause the RAF loop while the tab is hidden (saves CPU/battery); resume
    // seamlessly when visible. Reduced-motion stays static throughout.
    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    readColors();
    setup();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (reduce) {
      frame(0);
    } else {
      document.addEventListener("visibilitychange", onVisibility);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Socrates is ${state === "ended" ? "resting" : state}`}
      className={className}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
