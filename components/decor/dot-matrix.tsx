"use client";

import { useEffect, useRef } from "react";
import { chaos, mix, rgba, smooth, readRGBVar, type RGB } from "@/lib/dots";

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

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let S = spacing;
    let w = 0, h = 0, cols = 0, rows = 0, raf = 0;
    const start = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
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
      S = w < 700 ? 18 : 24; // denser, especially on mobile
      cols = Math.ceil(w / S) + 1; rows = Math.ceil(h / S) + 1;
      if (reduce) draw(0);
    };

    const GR = 240; // larger, gentler glow
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;
      ctx.clearRect(0, 0, w, h);
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
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 6.2832);
          ctx.fillStyle = rgba(mix(accent, lit, colorK), Math.min(0.85, alpha) * intensity);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
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

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (reduce) {
      draw(0);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect();
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
