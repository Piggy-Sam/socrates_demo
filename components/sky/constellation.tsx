"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  layoutStars,
  TYPE_GLYPH,
  type PlacedStar,
  type SkyStar,
} from "@/lib/constellation";

type Props = {
  stars: SkyStar[];
  selectedId?: string | null;
  onSelect?: (star: SkyStar) => void;
  className?: string;
  /** seconds the whole field takes to resolve in */
  igniteDuration?: number;
  /** false = ambient: not focusable, no tooltips */
  interactive?: boolean;
  /** show the bordered readout panel */
  framed?: boolean;
};

/**
 * The bank's plotted field — each thought a dot, positioned by recency &
 * recurrence (stable per id, so the field only grows). No connecting lines:
 * the decorative language is the living dot-matrix, this is its functional kin.
 */
export function Constellation({
  stars,
  selectedId,
  onSelect,
  className = "",
  igniteDuration = 1.2,
  interactive = true,
  framed = true,
}: Props) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  const placed = useMemo(() => layoutStars(stars), [stars]);
  const active = hovered ?? selectedId ?? null;
  const stagger = stars.length ? igniteDuration / stars.length : 0;

  return (
    <div
      className={`relative isolate size-full overflow-hidden ${
        framed
          ? "aspect-[16/10] rounded-md border border-hairline bg-raised"
          : ""
      } ${className}`}
      role={interactive ? "group" : undefined}
      aria-label={interactive ? "The field of your thinking" : undefined}
      aria-hidden={!interactive}
    >
      {placed.map((s, i) => (
        <Dot
          key={s.id}
          star={s}
          index={i}
          stagger={stagger}
          reduce={!!reduce}
          interactive={interactive}
          isActive={active === s.id}
          isDimmed={active != null && active !== s.id}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function Dot({
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
  const base = 4 + star.mag * 6;
  const sizePx = isActive ? base * 1.6 : base;
  const opacity = isDimmed ? 0.3 : 0.5 + star.mag * 0.5;
  const tooltipFlipX = star.x > 62;
  const tooltipFlipY = star.y < 24;

  const Tag = interactive ? motion.button : motion.span;

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
      className={`group absolute block -translate-x-1/2 -translate-y-1/2 rounded-full outline-none ${
        interactive
          ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          : "pointer-events-none"
      }`}
      style={{ left: `${star.x}%`, top: `${star.y}%` }}
      initial={reduce ? false : { opacity: 0, scale: 0 }}
      animate={{ opacity, scale: 1 }}
      transition={
        reduce
          ? { duration: 0 }
          : { delay: index * stagger, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }
      }
    >
      <span
        aria-hidden
        className="block rounded-full transition-all duration-300"
        style={{
          width: sizePx,
          height: sizePx,
          background: isActive ? "var(--accent)" : "rgb(var(--dot) / 0.9)",
          boxShadow: isActive
            ? "0 0 0 3px rgb(var(--accent-rgb) / 0.18)"
            : "none",
        }}
      />

      {interactive && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-20 w-52 max-w-[60vw] rounded-md border border-hairline-strong bg-raised p-3 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
            tooltipFlipX ? "right-3" : "left-3"
          } ${tooltipFlipY ? "top-3" : "bottom-3"}`}
        >
          <span className="label-mono flex items-center gap-1.5 text-accent">
            <span aria-hidden>{TYPE_GLYPH[star.type]}</span>
            {star.type}
          </span>
          <span className="mt-1.5 block font-sans text-sm leading-snug text-marble text-pretty">
            {star.content.length > 120
              ? star.content.slice(0, 120) + "…"
              : star.content}
          </span>
        </span>
      )}
    </Tag>
  );
}
