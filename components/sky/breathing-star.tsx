"use client";

import { useEffect, useRef } from "react";
import {
  wave,
  mix,
  mixInto,
  readRGBVar,
  fillBucket,
  fillStyleForBucket,
  type RGB,
} from "@/lib/dots";

// Render at ~45fps even on 120Hz ProMotion — motion is time-parameterized, so
// the capped cadence is invisible but halves the cost on those panels.
const FRAME_MS = 22;

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
  // the draw effect installs a "wake" callback here so a state change can
  // restart a parked (settled) loop without re-running the whole effect.
  const wakeRef = useRef<() => void>(() => {});

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
    let lastDraw = 0; // frame-budget gate (ProMotion guard)
    let onScreen = true; // IntersectionObserver gate
    let settledState: StarState | null = null; // state we've parked on (no RAF)
    const start = performance.now();
    let accent: RGB = [77, 124, 255];
    const readColors = () => {
      accent = readRGBVar("--accent-rgb", accent);
    };

    // Per-frame fill batching: colour+alpha bucket → [x,y,r,…]. One fillStyle
    // per bucket, no per-dot string allocation. Reused across frames.
    const buckets = new Map<number, number[]>();
    const col: RGB = [0, 0, 0]; // scratch for mixInto

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

    // draws one frame, returns the frame's summed energy (used to detect when a
    // settling state has gone effectively still)
    const frame = (t: number): number => {
      const st = stateRef.current;
      const lvl = levelRef.current;
      const ch = CHAR[st];
      ctx.clearRect(0, 0, size, size);
      for (const arr of buckets.values()) arr.length = 0; // reuse, no realloc
      const step = (size * 0.84) / (N - 1);
      const ox = size / 2 - C * step * ch.scale;
      const oy = size / 2 - C * step * ch.scale;
      const baseR = size * 0.026;
      const lit = mix(accent, [255, 255, 255], 0.35);

      let sumE = 0;
      for (const { gx, gy, rr } of cells) {
        const e = energy(st, rr, gx, gy, t);
        sumE += e;
        const x = ox + gx * step * ch.scale;
        const y = oy + gy * step * ch.scale;
        const boost = (st === "speaking" || st === "listening") ? lvl * 0.2 : 0;
        const radius = baseR * (0.4 + 1.05 * e) * ch.scale;
        const alpha = Math.min(1, (0.18 + 0.82 * e) * ch.bright + boost);
        mixInto(col, accent, lit, e * 0.4);
        const key = fillBucket(col[0], col[1], col[2], alpha);
        let arr = buckets.get(key);
        if (!arr) { arr = []; buckets.set(key, arr); }
        arr.push(x, y, radius);
      }
      // one fillStyle assignment + one fill() per colour bucket
      for (const [key, arr] of buckets) {
        if (arr.length === 0) continue;
        ctx.fillStyle = fillStyleForBucket(key);
        ctx.beginPath();
        for (let k = 0; k < arr.length; k += 3) {
          ctx.moveTo(arr[k] + arr[k + 2], arr[k + 1]);
          ctx.arc(arr[k], arr[k + 1], arr[k + 2], 0, 6.2832);
        }
        ctx.fill();
      }
      return sumE;
    };

    let prevSum = NaN;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // frame-budget gate: ~45fps regardless of panel refresh; motion is
      // time-based, so the capped cadence is pixel-equivalent.
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;

      const st = stateRef.current;
      const sum = frame((now - start) / 1000);
      // the "ended" state settles to a near-still, dim glow; once the mean
      // per-dot energy delta is negligible, park the RAF (it restarts on any
      // stateRef change via wakeRef). Breathing states (idle/listening/speaking/
      // thinking) oscillate forever, so they keep animating.
      const meanDelta = Number.isNaN(prevSum)
        ? Infinity
        : Math.abs(sum - prevSum) / cells.length;
      if (st === "ended" && meanDelta < 0.0008) {
        cancelAnimationFrame(raf);
        raf = 0;
        settledState = st;
      }
      prevSum = sum;
    };

    // Run only when the tab is visible AND the orb is on-screen. Reduced-motion
    // stays static. A parked "settled" state is left parked here.
    const shouldRun = () =>
      !reduce && !document.hidden && onScreen && settledState === null;
    const sync = () => {
      if (shouldRun()) {
        if (!raf) { lastDraw = 0; raf = requestAnimationFrame(loop); }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const onVisibility = sync;

    readColors();
    setup();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].intersectionRatio > 0;
        if (!reduce) sync();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    // a state change (from the sibling effect below) may need to wake a parked
    // loop (e.g. leaving "ended") or refresh the static reduced-motion frame.
    wakeRef.current = () => {
      prevSum = NaN;
      if (settledState !== null && stateRef.current !== settledState) {
        settledState = null;
      }
      if (reduce) frame(0);
      else sync();
    };

    if (reduce) {
      frame(0);
    } else {
      document.addEventListener("visibilitychange", onVisibility);
      sync();
    }

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
      wakeRef.current = () => {};
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size]);

  // Wake the draw loop when the state changes (the main effect is keyed only on
  // `size` so the canvas/setup persists; this nudges a parked "ended" loop back
  // to life and re-renders the static reduced-motion frame).
  useEffect(() => {
    wakeRef.current();
  }, [state]);

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
