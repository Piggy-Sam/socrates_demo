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
    let S = spacing;
    let w = 0, h = 0, cols = 0, rows = 0, raf = 0;
    const start = performance.now();

    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    let accent: RGB = [15, 98, 254];
    let marble: RGB = [11, 15, 26];
    const readColors = () => {
      accent = readRGBVar("--accent-rgb", accent);
      marble = readRGBVar("--marble-rgb", marble);
    };

    const F = BUST_FACE; // { w, h, d[] }
    const faceAspect = F.w / F.h;

    // Where the face sits — derived from the layout element's rect. This only
    // changes on resize / layout, so we cache it and recompute via measure()
    // instead of calling getBoundingClientRect() every frame.
    const geom = {
      has: false,
      fx: 0, fy: 0, fscale: 0, rcx: 0, rcy: 0, orbR: 1, maxD: 1,
    };
    const measure = () => {
      const el = document.getElementById(faceId);
      const r = el?.getBoundingClientRect();
      if (r && r.width > 4 && r.height > 4) {
        geom.has = true;
        const fit = 1.0;
        if (r.width / r.height > faceAspect) {
          geom.fscale = (r.height * fit) / F.h;
        } else {
          geom.fscale = (r.width * fit) / F.w;
        }
        const lift = r.height * 0.06; // sit a touch higher in the box
        geom.fx = r.left + r.width / 2 - (F.w * geom.fscale) / 2;
        geom.fy = r.top + r.height / 2 - (F.h * geom.fscale) / 2 - lift;
        geom.rcx = r.left + r.width / 2;
        geom.rcy = r.top + r.height / 2 - lift;
        geom.orbR = Math.min(r.width, r.height) * 0.62;
        geom.maxD = Math.hypot(Math.max(geom.rcx, w - geom.rcx), Math.max(geom.rcy, h - geom.rcy)) || 1;
      } else {
        geom.has = false;
      }
    };

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // dense lattice, especially on mobile (higher face resolution)
      S = w < 700 ? 11 : 15;
      cols = Math.ceil(w / S) + 1; rows = Math.ceil(h / S) + 1;
      measure(); // canvas size changed → face position / maxD changed
    };

    // morph m: 0 = face, 1 = orb. Random schedule; the orb HOLDS a while.
    let m = 0, target = 0, next = 6 + Math.random() * 5;
    const stepMorph = (t: number) => {
      if (t > next) {
        if (target === 0) { target = 1; next = t + 5 + Math.random() * 4; }
        else { target = 0; next = t + 11 + Math.random() * 7; }
      }
      m += (target - m) * 0.045;
    };

    const GR = 300; // cursor reach — a large, gentle glow

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      stepMorph(t);
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;

      // where the face sits — cached (see measure()); recomputed on resize only
      const { has, fx, fy, fscale, rcx, rcy, orbR, maxD } = geom;

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
            let orbVal = 0;
            if (rr < 1) {
              // the design-system orb's "speaking" rhythm: rings emanate outward
              const ring =
                0.5 + 0.34 * Math.sin(rr * 9 - t * 5) + 0.16 * Math.sin(rr * 15 - t * 8.2);
              orbVal = smooth(1.05 - rr) * (0.4 + 0.6 * Math.max(0, Math.min(1, ring)));
            }
            centerVal = faceVal * (1 - m) + orbVal * m;

            // concentric, uniform gradient — farthest edge → centerpiece
            const dc = Math.hypot(X - rcx, Y - rcy);
            g = 1 - dc / maxD;
            if (g < 0) g = 0;
          }

          // size + opacity (the DNA carries motion; chaotic base) — the
          // concentric gradient swells dots smoothly toward the centerpiece
          const rAmb = (1.3 + ce * 1.5) * (1 + g * 1.0);
          let radius = rAmb + centerVal * (S * 0.46 - rAmb);
          radius *= 0.82 + 0.32 * ce;

          const aAmb = (0.05 + ce * 0.12) * (1 + g * 0.8);
          let alpha = aAmb + centerVal * (0.92 - aAmb);
          alpha *= 0.78 + 0.28 * ce;

          // colour: ambient faint accent → face marble → orb accent
          const centerColor = mix(marble, accent, m);
          let color = mix(accent, centerColor, centerVal);

          // cursor: brighten + ENLARGE nearby dots, non-uniform (entropy), no
          // halo — the glow lives in the dots themselves.
          if (ptr.active) {
            const d = Math.hypot(X - ptr.x, Y - ptr.y);
            if (d < GR) {
              // large, gentle glow — subtle per dot, non-uniform (entropy)
              const fe = smooth(1 - d / GR);
              const ent = 0.4 + 0.9 * ce;
              radius += fe * 1.7 * ent;
              alpha += fe * 0.3 * ent;
              color = mix(color, lit, fe * 0.45);
            }
          }

          const fa = Math.min(1, alpha);
          if (fa < 0.018) continue; // cull invisible dots (keeps it fast)
          ctx.beginPath();
          ctx.arc(X, Y, Math.max(0.4, radius), 0, 6.2832);
          ctx.fillStyle = rgba(color, fa);
          ctx.fill();
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      ptr.tx = e.clientX; ptr.ty = e.clientY;
      if (!ptr.active) { ptr.x = e.clientX; ptr.y = e.clientY; }
      ptr.active = true;
    };
    const onLeave = () => { ptr.active = false; };
    // touch is transient: deactivate when the finger lifts (pointerleave
    // doesn't fire for touch). Mouse keeps hovering (handled by pointerleave).
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") ptr.active = false;
    };

    // pause the RAF loop while the tab is hidden (saves CPU/battery); resume
    // seamlessly when visible. Reduced-motion stays static throughout.
    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        measure(); // layout may have shifted while hidden
        raf = requestAnimationFrame(draw);
      }
    };

    readColors();
    resize();
    // canvas box change → full resize (also re-measures); face cell change →
    // just re-measure its cached geometry.
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const faceRo = new ResizeObserver(measure);
    const faceEl = document.getElementById(faceId);
    if (faceEl) faceRo.observe(faceEl);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    // the canvas is fixed but #hero-face scrolls with the page, so its
    // viewport rect shifts on scroll — re-measure then (cheap, not per-frame).
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); faceRo.disconnect(); mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("visibilitychange", onVisibility);
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
