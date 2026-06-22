"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  /** grid spacing in px */
  spacing?: number;
  /** global alpha multiplier (keep it faint behind content) */
  intensity?: number;
};

/**
 * The signature decorative language: a living dot-matrix. A faint grid of dots
 * breathes with slow overlapping waves and comes alive around the pointer —
 * dots near the cursor brighten, swell, and are gently repelled, like a lens
 * passing over the field. Canvas-based, DPR-aware, theme-aware, and static
 * under prefers-reduced-motion. Decorative only (pointer-events: none).
 */
export function DotMatrix({
  className = "",
  spacing = 28,
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

    let w = 0,
      h = 0,
      cols = 0,
      rows = 0,
      raf = 0;
    const start = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    let accent: [number, number, number] = [15, 98, 254];

    const readAccent = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-rgb")
        .trim();
      const parts = v.split(/\s+/).map(Number);
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n)))
        accent = parts as [number, number, number];
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
      const [r, g, b] = accent;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          ctx.beginPath();
          ctx.arc(i * spacing, j * spacing, 1.1, 0, 6.2832);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.13 * intensity})`;
          ctx.fill();
        }
    };

    const PR = 180;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ptr.x += (ptr.tx - ptr.x) * 0.1;
      ptr.y += (ptr.ty - ptr.y) * 0.1;
      ctx.clearRect(0, 0, w, h);
      const [ar, ag, ab] = accent;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * spacing;
          const y = j * spacing;
          // two overlapping slow waves — the field breathing
          const wave =
            (Math.sin(x * 0.012 + y * 0.012 - t * 0.85) * 0.5 + 0.5) * 0.7 +
            (Math.sin(x * 0.022 - y * 0.017 + t * 0.5) * 0.5 + 0.5) * 0.3;
          let radius = 0.85 + wave * 1.1;
          let alpha = 0.08 + wave * 0.1;
          let ox = 0,
            oy = 0;

          if (ptr.active) {
            const dx = x - ptr.x;
            const dy = y - ptr.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < PR * PR) {
              const d = Math.sqrt(d2);
              const f = 1 - d / PR;
              const fe = f * f * (3 - 2 * f); // smoothstep falloff
              radius += fe * 3.4;
              alpha += fe * 0.6;
              const rep = (fe * 14) / Math.max(d, 14);
              ox = dx * rep;
              oy = dy * rep;
            }
          }

          ctx.beginPath();
          ctx.arc(x + ox, y + oy, radius, 0, 6.2832);
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${Math.min(0.8, alpha) * intensity})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      // map viewport coords into canvas-local space (works framed or full-bleed)
      const rect = canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      const inside = lx >= -PR && ly >= -PR && lx <= w + PR && ly <= h + PR;
      if (!inside) {
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
      ptr.tx = -9999;
      ptr.ty = -9999;
    };

    readAccent();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(readAccent);
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
