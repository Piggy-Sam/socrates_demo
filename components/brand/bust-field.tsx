"use client";

import { useEffect, useRef } from "react";
import { BUST_DOTS, BUST_VIEWBOX } from "./bust-dots";
import { wave, mix, rgba, smooth, readRGBVar, type RGB } from "@/lib/dots";

const [VBX, VBY, VBW, VBH] = BUST_VIEWBOX.split(" ").map(Number);
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

type Props = {
  className?: string;
  /** fit factor of the bust within its box */
  fit?: number;
  /** intermittently morph bust ⇄ orb (the centerpiece) */
  morph?: boolean;
  /** cursor lens */
  interactive?: boolean;
};

/**
 * The centerpiece: Socrates' face as a living dot-field on canvas. Every dot
 * always pulses in size/opacity/colour (the DNA); the cursor is a local lens;
 * and — when `morph` — the whole face intermittently dissolves into the orb
 * (the app's secondary dot-matrix identity) and reforms. Fills its parent.
 */
export function BustField({
  className = "",
  fit = 0.92,
  morph = false,
  interactive = false,
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
    const N = BUST_DOTS.length;

    let w = 0, h = 0, raf = 0;
    const start = performance.now();
    const ptr = { x: -1, y: -1, active: false };
    let marble: RGB = [11, 15, 26];
    let accent: RGB = [15, 98, 254];

    const readColors = () => {
      marble = readRGBVar("--marble-rgb", marble);
      accent = readRGBVar("--accent-rgb", accent);
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) render(0, 0);
    };

    // morph factor over time: hold bust, dissolve to orb, hold, reform
    const morphAt = (t: number) => {
      if (!morph) return 0;
      const P = 13;
      const u = t % P;
      if (u < 6) return 0;
      if (u < 7.6) return smooth((u - 6) / 1.6);
      if (u < 10) return 1;
      if (u < 11.6) return 1 - smooth((u - 10) / 1.6);
      return 0;
    };

    const render = (t: number, m: number) => {
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(w / VBW, h / VBH) * fit;
      const offX = (w - VBW * scale) / 2 - VBX * scale;
      const offY = (h - VBH * scale) / 2 - VBY * scale;
      const ocx = w / 2, ocy = h / 2;
      const R = Math.min(w, h) * 0.42;
      const lit = mix(marble, accent, 0.5);

      for (let i = 0; i < N; i++) {
        const [cx, cy, br] = BUST_DOTS[i];
        // bust position + a pulsing radius (the DNA)
        const e = wave(cx * 0.5, cy * 0.5, t);
        const bx = offX + cx * scale;
        const by = offY + cy * scale;
        const bustR = br * scale * (0.62 + 0.7 * e);

        let x = bx, y = by, radius = bustR, colorK = e * 0.18;
        let alpha = 0.5 + 0.5 * e;

        if (m > 0) {
          // orb target — phyllotaxis disc, with a radial pulse
          const rr = Math.sqrt((i + 0.5) / N) * R;
          const th = i * GOLDEN + t * 0.25;
          const ox = ocx + rr * Math.cos(th);
          const oy = ocy + rr * Math.sin(th);
          const oe = wave(rr * 0.06, th, t * 1.2);
          const orbR = Math.max(1.6, R * 0.05) * (0.5 + 0.9 * oe);
          x = bx + (ox - bx) * m;
          y = by + (oy - by) * m;
          radius = bustR + (orbR - bustR) * m;
          colorK = colorK + m * 0.85; // orb is the accent presence
          alpha = alpha + (0.55 + 0.45 * oe - alpha) * m;
        }

        if (interactive && ptr.active) {
          const d = Math.hypot(x - ptr.x, y - ptr.y);
          const PR = Math.max(70, R * 0.6);
          if (d < PR) {
            const fe = smooth(1 - d / PR);
            radius += fe * scale * 0.5;
            alpha = Math.min(1, alpha + fe * 0.4);
            colorK = Math.min(1, colorK + fe * 0.7);
          }
        }

        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.4, radius), 0, 6.2832);
        ctx.fillStyle = rgba(mix(marble, lit, Math.min(1, colorK)), Math.min(1, alpha));
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      const t = (now - start) / 1000;
      render(t, morphAt(t));
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      ptr.active =
        ptr.x >= -60 && ptr.y >= -60 && ptr.x <= w + 60 && ptr.y <= h + 60;
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
    if (interactive)
      window.addEventListener("pointermove", onMove, { passive: true });

    if (reduce) render(0, 0);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [fit, morph, interactive]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
