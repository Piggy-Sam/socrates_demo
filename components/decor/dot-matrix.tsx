"use client";

import { useEffect, useRef } from "react";
import { wave, mix, rgba, smooth, readRGBVar, type RGB } from "@/lib/dots";

type Props = {
  className?: string;
  /** grid spacing in px */
  spacing?: number;
  /** global alpha multiplier (keep it faint behind content) */
  intensity?: number;
};

/**
 * The living dot-matrix — the signature decorative language. A faint grid of
 * sizeable dots that ALWAYS breathes: each dot pulses in size, opacity, and
 * colour from overlapping waves (its own rhythm). The cursor is a local lens —
 * nearby dots brighten and swell, with only a slight, elegant displacement.
 * Canvas-based, DPR/theme-aware, static under prefers-reduced-motion.
 */
export function DotMatrix({
  className = "",
  spacing = 30,
  intensity = 1,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let w = 0, h = 0, cols = 0, rows = 0, raf = 0;
    const start = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    let accent: RGB = [15, 98, 254];
    let lit: RGB = [120, 170, 255];

    const readColors = () => {
      accent = readRGBVar("--accent-rgb", accent);
      // a lighter tint for wave/cursor peaks (colour dynamism)
      lit = mix(accent, [255, 255, 255], 0.4);
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / spacing) + 1;
      rows = Math.ceil(h / spacing) + 1;
      if (reduce) drawStatic();
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          ctx.beginPath();
          ctx.arc(i * spacing, j * spacing, 1.7, 0, 6.2832);
          ctx.fillStyle = rgba(accent, 0.14 * intensity);
          ctx.fill();
        }
    };

    const PR = 150;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;
      ctx.clearRect(0, 0, w, h);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * spacing;
          const y = j * spacing;
          // always-on DNA: size + opacity + colour from the wave
          const e = wave(x * 0.045, y * 0.045, t);
          let radius = 1.5 + e * 2.2; // bigger dots
          let alpha = 0.07 + e * 0.13;
          let colorK = e * 0.5; // toward the lighter tint at peaks
          let ox = 0, oy = 0;

          if (ptr.active) {
            const dx = x - ptr.x;
            const dy = y - ptr.y;
            const d = Math.hypot(dx, dy);
            if (d < PR) {
              const fe = smooth(1 - d / PR);
              radius += fe * 2.6; // mostly size...
              alpha += fe * 0.5; // ...and opacity
              colorK = Math.min(1, colorK + fe * 0.8); // ...and colour
              const rep = (fe * 3) / Math.max(d, 18); // only a slight nudge
              ox = dx * rep;
              oy = dy * rep;
            }
          }

          ctx.beginPath();
          ctx.arc(x + ox, y + oy, radius, 0, 6.2832);
          ctx.fillStyle = rgba(mix(accent, lit, colorK), Math.min(0.85, alpha) * intensity);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      if (lx < -PR || ly < -PR || lx > w + PR || ly > h + PR) {
        ptr.active = false;
        return;
      }
      ptr.tx = lx;
      ptr.ty = ly;
      if (!ptr.active) {
        ptr.x = lx;
        ptr.y = ly;
      }
      ptr.active = true;
    };
    const onLeave = () => {
      ptr.active = false;
    };

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (reduce) {
      drawStatic();
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
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
