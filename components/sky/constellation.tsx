"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  layoutStars,
  themeLinks,
  TYPE_GLYPH,
  type PlacedStar,
  type SkyStar,
} from "@/lib/constellation";

type Props = {
  stars: SkyStar[];
  selectedId?: string | null;
  onSelect?: (star: SkyStar) => void;
  className?: string;
  /** seconds the whole sky takes to ignite */
  igniteDuration?: number;
  /** false = ambient backdrop: not focusable, no tooltips, no hover dimming */
  interactive?: boolean;
  /** show the bordered/rounded sky frame (off for full-bleed backdrops) */
  framed?: boolean;
};

export function Constellation({
  stars,
  selectedId,
  onSelect,
  className = "",
  igniteDuration = 1.6,
  interactive = true,
  framed = true,
}: Props) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  const placed = useMemo(() => layoutStars(stars), [stars]);
  const links = useMemo(() => themeLinks(placed), [placed]);
  const byId = useMemo(
    () => new Map(placed.map((s) => [s.id, s])),
    [placed],
  );

  const active = hovered ?? selectedId ?? null;
  const activeThemes = useMemo(() => {
    if (!active) return new Set<string>();
    return new Set(byId.get(active)?.themes ?? []);
  }, [active, byId]);

  const stagger = stars.length ? igniteDuration / stars.length : 0;

  return (
    <div
      className={`relative isolate size-full overflow-hidden ${
        framed
          ? "aspect-[16/10] rounded-lg border border-hairline bg-raised-2/40"
          : ""
      } ${className}`}
      role={interactive ? "group" : undefined}
      aria-label={interactive ? "The constellation of your mind" : undefined}
      aria-hidden={!interactive}
    >
      {/* line layer — themes drawing constellations */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {links.map((l, i) => {
          const a = byId.get(l.a);
          const b = byId.get(l.b);
          if (!a || !b) return null;
          const lit = active != null && activeThemes.has(l.theme);
          return (
            <motion.line
              key={`${l.theme}-${l.a}-${l.b}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgb(var(--constellation-line))"
              strokeWidth={lit ? 0.35 : 0.18}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: lit ? 0.7 : 0.22,
              }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      pathLength: {
                        delay: igniteDuration * 0.5 + i * 0.04,
                        duration: 0.7,
                        ease: [0.2, 0.8, 0.2, 1],
                      },
                      opacity: { duration: 0.4 },
                    }
              }
            />
          );
        })}
      </svg>

      {/* star layer */}
      {placed.map((s, i) => {
        const related =
          active === s.id ||
          (s.themes ?? []).some((t) => activeThemes.has(t));
        return (
          <Star
            key={s.id}
            star={s}
            index={i}
            stagger={stagger}
            reduce={!!reduce}
            interactive={interactive}
            isActive={active === s.id}
            isDimmed={active != null && !related}
            onHover={setHovered}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

function Star({
  star,
  index,
  stagger,
  reduce,
  interactive,
  isActive,
  isDimmed,
  onHover,
  onSelect,
}: {
  star: PlacedStar;
  index: number;
  stagger: number;
  reduce: boolean;
  interactive: boolean;
  isActive: boolean;
  isDimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect?: (star: SkyStar) => void;
}) {
  // px size from magnitude; active gets a gentle bump
  const base = 4 + star.mag * 7;
  const size = isActive ? base * 1.5 : base;
  const opacity = isDimmed ? 0.3 : 0.5 + star.mag * 0.5;
  const tooltipFlipX = star.x > 62;
  const tooltipFlipY = star.y < 22;

  const Tag: React.ElementType = interactive ? motion.button : motion.span;

  return (
    <Tag
      {...(interactive
        ? {
            type: "button" as const,
            onMouseEnter: () => onHover(star.id),
            onMouseLeave: () => onHover(null),
            onFocus: () => onHover(star.id),
            onBlur: () => onHover(null),
            onClick: () => onSelect?.(star),
            "aria-label": `${star.type}: ${star.content.slice(0, 80)}`,
          }
        : { "aria-hidden": true })}
      className={`group absolute block -translate-x-1/2 -translate-y-1/2 rounded-full ${
        interactive ? "cursor-pointer" : "pointer-events-none"
      }`}
      style={{ left: `${star.x}%`, top: `${star.y}%` }}
      initial={reduce ? false : { opacity: 0, scale: 0 }}
      animate={{ opacity, scale: 1 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              delay: index * stagger,
              duration: 0.6,
              ease: [0.2, 0.8, 0.2, 1],
            }
      }
    >
      {/* glow */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
        style={{
          width: size * 3.2,
          height: size * 3.2,
          background:
            "radial-gradient(circle, rgb(var(--star-glow) / 0.55), transparent 70%)",
          opacity: isActive ? 1 : 0.5,
        }}
      />
      {/* core */}
      <span
        aria-hidden
        className="block rounded-full transition-all duration-300"
        style={{
          width: size,
          height: size,
          background: isActive
            ? "var(--gold-lit)"
            : "color-mix(in oklab, var(--gold) 75%, var(--marble))",
          boxShadow: isActive
            ? "0 0 12px 2px rgb(var(--star-glow) / 0.8)"
            : "0 0 6px 0 rgb(var(--star-glow) / 0.4)",
        }}
      />

      {/* readout — the instrument's label, on hover/focus */}
      {interactive && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-20 w-52 max-w-[60vw] rounded-md border border-hairline-strong bg-raised/95 p-3 opacity-0 shadow-xl backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
            tooltipFlipX ? "right-3" : "left-3"
          } ${tooltipFlipY ? "top-3" : "bottom-3"}`}
        >
          <span className="label-mono flex items-center gap-1.5">
            <span aria-hidden>{TYPE_GLYPH[star.type]}</span>
            {star.type}
          </span>
          <span className="mt-1.5 block font-serif text-sm leading-snug text-marble text-pretty">
            {star.content.length > 120
              ? star.content.slice(0, 120) + "…"
              : star.content}
          </span>
        </span>
      )}
    </Tag>
  );
}
