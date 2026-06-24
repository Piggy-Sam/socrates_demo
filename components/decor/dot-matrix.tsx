"use client";

import { useEffect, useRef } from "react";
import {
  chaos,
  mix,
  mixInto,
  smooth,
  sampleJolts,
  readRGBVar,
  fillBucket,
  fillStyleForBucket,
  type RGB,
} from "@/lib/dots";

// Render at ~45fps even on 120Hz ProMotion — motion is time-parameterized, so
// dropping the cadence is invisible but halves the canvas cost on those panels.
const FRAME_MS = 22;

type Props = {
  className?: string;
  spacing?: number;
  intensity?: number;
};

/**
 * The living dot-matrix (ambient background). A lattice of sizeable dots with an
 * always-on CHAOTIC base — each dot flickers in size/opacity/colour on its own
 * rhythm. The cursor pools soft light (a glow) and brightens nearby dots; it
 * never moves or deforms them. Canvas/DPR/theme-aware; static under reduced motion.
 */
export function DotMatrix({ className = "", spacing = 30, intensity = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = reduceMq.matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let S = spacing;
    let w = 0, h = 0, cols = 0, rows = 0, raf = 0;
    let lastDraw = 0; // frame-budget gate (ProMotion guard)
    let onScreen = true; // IntersectionObserver gate
    const start = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    // Per-frame fill batching: each colour+alpha bucket collects [x,y,r,…] so we
    // assign fillStyle once per bucket (not per dot) and allocate no strings.
    // Arrays are reused across frames (length reset to 0, backing store kept).
    const buckets = new Map<number, number[]>();
    const col: RGB = [0, 0, 0]; // scratch for mixInto — no per-dot allocation
    // jolts arrive in viewport coords; cache the canvas's viewport offset so we
    // can map each local dot back to viewport space when sampling them.
    const off = { x: 0, y: 0 };
    let accent: RGB = [15, 98, 254];
    let lit: RGB = [120, 170, 255];
    const readColors = () => {
      accent = readRGBVar("--accent-rgb", accent);
      lit = mix(accent, [255, 255, 255], 0.45);
    };

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = w < 700 ? 14 : 19; // dense, especially on mobile
      cols = Math.ceil(w / S) + 1; rows = Math.ceil(h / S) + 1;
      const rect = canvas.getBoundingClientRect();
      off.x = rect.left; off.y = rect.top;
      if (reduce) draw(0);
    };

    const GR = 240; // larger, gentler glow
    const draw = (now: number) => {
      if (!reduce) raf = requestAnimationFrame(draw);
      // frame-budget gate: keep requesting frames (so cursor easing stays live)
      // but only re-render once ~22ms have passed. Motion is time-based, so the
      // capped cadence is pixel-equivalent to running uncapped.
      if (!reduce && now - lastDraw < FRAME_MS) return;
      lastDraw = now;

      const t = (now - start) / 1000;
      const wall = now / 1000; // wall-clock secs — jolt timestamps live here
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;
      ctx.clearRect(0, 0, w, h);
      for (const arr of buckets.values()) arr.length = 0; // reuse, no realloc
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * S, y = j * S;
          const e = reduce ? 0.5 : chaos(i * 73.1 + j * 19.7, t);
          let radius = 1.5 + e * 2.2;
          let alpha = 0.06 + e * 0.13;
          let colorK = e * 0.4;
          if (ptr.active) {
            const d = Math.hypot(x - ptr.x, y - ptr.y);
            if (d < GR) {
              const fe = smooth(1 - d / GR);
              const ent = 0.4 + 0.9 * e; // entropy — non-uniform
              radius += fe * 1.6 * ent;
              alpha += fe * 0.28 * ent;
              colorK = Math.min(1, colorK + fe * 0.55);
            }
          }
          // injected impulse (CTA jolt etc.) — an expanding ring of energy that
          // only adds size/opacity/colour, never moves a dot. Reduced-motion
          // already gates emitJolt at the source, so this is dormant there.
          if (!reduce) {
            const jolt = sampleJolts(x + off.x, y + off.y, wall);
            if (jolt > 0) {
              // a MASSIVE swell: dots clearly enlarge, brighten, and shift to the
              // accent as the wavefront passes — but keep the per-dot entropy (e)
              // so the wave reads organic, not a clean CGI hoop.
              const ent = 0.55 + 0.9 * e;
              radius += jolt * 4.6 * ent;
              alpha += jolt * 0.7 * ent;
              colorK = Math.min(1, colorK + jolt * 0.85);
            }
          }
          const fa = Math.min(0.85, alpha) * intensity;
          if (fa < 0.02) continue; // cull invisible dots
          mixInto(col, accent, lit, colorK);
          const key = fillBucket(col[0], col[1], col[2], fa);
          let arr = buckets.get(key);
          if (!arr) { arr = []; buckets.set(key, arr); }
          arr.push(x, y, radius);
        }
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
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      if (lx < -GR || ly < -GR || lx > w + GR || ly > h + GR) {
        ptr.active = false;
        return;
      }
      ptr.tx = lx; ptr.ty = ly;
      if (!ptr.active) { ptr.x = lx; ptr.y = ly; }
      ptr.active = true;
    };
    const onLeave = () => { ptr.active = false; };
    // touch is transient — deactivate on finger-lift (mouse keeps hovering)
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") ptr.active = false;
    };

    // Run only when the tab is visible AND the canvas is actually on-screen.
    // Scrolled-away or tab-hidden → the loop fully stops (no wasted frames on
    // the app shell behind another view). Reduced-motion stays static.
    const shouldRun = () => !reduce && !document.hidden && onScreen;
    const sync = () => {
      if (shouldRun()) {
        if (!raf) { lastDraw = 0; raf = requestAnimationFrame(draw); }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const onVisibility = sync;

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // pause the loop when the canvas scrolls fully out of view (e.g. the app
    // shell behind another route) — combines with the tab-hidden check.
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].intersectionRatio > 0;
        if (!reduce) sync();
      },
      { threshold: 0 },
    );
    io.observe(canvas);
    // Listeners are registered unconditionally: under reduced motion the loop
    // never runs (shouldRun() short-circuits on `reduce`), so they sit inert —
    // but they're already live the moment the OS preference flips back off.
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    // Live reduced-motion toggle: the preference can flip while the page is open.
    // On change we re-evaluate WITHOUT a remount — park the RAF + paint one
    // static frame, or resume the loop.
    const onReduceChange = (e: MediaQueryListEvent) => {
      reduce = e.matches;
      if (reduce) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        draw(0);
      } else {
        sync();
      }
    };
    reduceMq.addEventListener("change", onReduceChange);

    if (reduce) {
      draw(0);
    } else {
      sync();
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); io.disconnect();
      reduceMq.removeEventListener("change", onReduceChange);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [spacing, intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
