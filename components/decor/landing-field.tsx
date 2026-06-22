"use client";

import { useEffect, useRef } from "react";
import { BUST_FACE } from "@/components/brand/bust-dots";
import { chaos, mix, rgba, smooth, readRGBVar, type RGB } from "@/lib/dots";

type Props = {
  /** id of the element marking where the face emerges (the hero's left cell) */
  faceId: string;
  className?: string;
  spacing?: number;
};

/**
 * The unified landing field. ONE lattice of dots: an always-on CHAOTIC base
 * everywhere, a size/opacity gradient that swells toward the centerpiece, and —
 * within that region — the dots resolve into Socrates' FACE (it emerges from the
 * same field, not a separate layer). The face↔orb change is pure SIZE/OPACITY/
 * COLOUR (no dot ever moves). The cursor pools soft light (glow), it does not
 * deform the lattice. Orb appears at random for ~20% of the time.
 */
export function LandingField({ faceId, className = "", spacing = 22 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = spacing;
    let w = 0, h = 0, cols = 0, rows = 0, raf = 0;
    const start = performance.now();

    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    let accent: RGB = [15, 98, 254];
    let marble: RGB = [11, 15, 26];
    const readColors = () => {
      accent = readRGBVar("--accent-rgb", accent);
      marble = readRGBVar("--marble-rgb", marble);
    };

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / S) + 1; rows = Math.ceil(h / S) + 1;
    };

    // morph m: 0 = face, 1 = orb. Random schedule, ~20% orb.
    let m = 0, target = 0, next = 6 + Math.random() * 5;
    const stepMorph = (t: number) => {
      if (t > next) {
        if (target === 0) { target = 1; next = t + 2 + Math.random() * 2.2; }
        else { target = 0; next = t + 9 + Math.random() * 7; }
      }
      m += (target - m) * 0.045;
    };

    const F = BUST_FACE; // { w, h, d[] }
    const faceAspect = F.w / F.h;

    const GR = 150; // cursor glow radius
    const RAMP = 230; // gradient reach toward the centerpiece

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      stepMorph(t);
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;

      // where the face sits this frame (follows the layout element)
      const el = document.getElementById(faceId);
      const r = el?.getBoundingClientRect();
      let fx = 0, fy = 0, fscale = 0, rcx = 0, rcy = 0, orbR = 1;
      let rectL = 0, rectR = 0, rectT = 0, rectB = 0, has = false;
      if (r && r.width > 4 && r.height > 4) {
        has = true;
        rectL = r.left; rectR = r.right; rectT = r.top; rectB = r.bottom;
        const fit = 0.96;
        if (r.width / r.height > faceAspect) {
          fscale = (r.height * fit) / F.h;
        } else {
          fscale = (r.width * fit) / F.w;
        }
        fx = rectL + r.width / 2 - (F.w * fscale) / 2;
        fy = rectT + r.height / 2 - (F.h * fscale) / 2;
        rcx = rectL + r.width / 2;
        rcy = rectT + r.height / 2;
        orbR = Math.min(r.width, r.height) * 0.42;
      }

      ctx.clearRect(0, 0, w, h);
      const lit = mix(accent, [255, 255, 255], 0.45);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const X = i * S, Y = j * S;
          const ce = reduce ? 0.5 : chaos(i * 73.1 + j * 19.7, t);

          // centerpiece density (face ⇄ orb, no movement)
          let centerVal = 0, g = 0;
          if (has) {
            const fu = (X - fx) / fscale;
            const fv = (Y - fy) / fscale;
            let faceVal = 0;
            if (fu >= 0 && fu < F.w && fv >= 0 && fv < F.h) {
              faceVal = F.d[(fv | 0) * F.w + (fu | 0)] || 0;
            }
            const ou = (X - rcx) / orbR, ov = (Y - rcy) / orbR;
            const rr = Math.hypot(ou, ov);
            const orbVal = rr < 1 ? smooth(1.05 - rr) : 0;
            centerVal = faceVal * (1 - m) + orbVal * m;

            // gradient: swell ambient dots toward the centerpiece rect
            const dx = Math.max(rectL - X, 0, X - rectR);
            const dy = Math.max(rectT - Y, 0, Y - rectB);
            g = smooth(1 - Math.hypot(dx, dy) / RAMP);
          }

          // size + opacity (the DNA carries motion; chaotic base)
          const rAmb = (1.3 + ce * 1.5) * (1 + g * 0.7);
          let radius = rAmb + centerVal * (S * 0.46 - rAmb);
          radius *= 0.82 + 0.32 * ce;

          const aAmb = (0.06 + ce * 0.13) * (1 + g * 0.5);
          let alpha = aAmb + centerVal * (0.92 - aAmb);
          alpha *= 0.78 + 0.28 * ce;

          // colour: ambient faint accent → face marble → orb accent
          const centerColor = mix(marble, accent, m);
          let color = mix(accent, centerColor, centerVal);

          // cursor: pool light (brightness only, no deform)
          if (ptr.active) {
            const d = Math.hypot(X - ptr.x, Y - ptr.y);
            if (d < GR) {
              const fe = smooth(1 - d / GR);
              alpha += fe * 0.4;
              color = mix(color, lit, fe * 0.6);
            }
          }

          ctx.beginPath();
          ctx.arc(X, Y, Math.max(0.4, radius), 0, 6.2832);
          ctx.fillStyle = rgba(color, Math.min(1, alpha));
          ctx.fill();
        }
      }

      // soft glow pooled at the cursor — light leaking off the field
      if (ptr.active && !reduce) {
        const grd = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, GR);
        grd.addColorStop(0, rgba(accent, 0.1));
        grd.addColorStop(1, rgba(accent, 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grd;
        ctx.fillRect(ptr.x - GR, ptr.y - GR, GR * 2, GR * 2);
        ctx.globalCompositeOperation = "source-over";
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      ptr.tx = e.clientX; ptr.ty = e.clientY;
      if (!ptr.active) { ptr.x = e.clientX; ptr.y = e.clientY; }
      ptr.active = true;
    };
    const onLeave = () => { ptr.active = false; };

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [faceId, spacing]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
