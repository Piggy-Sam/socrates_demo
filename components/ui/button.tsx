"use client";

import { forwardRef, useCallback } from "react";
import Link from "next/link";
import { emitJolt } from "@/lib/dots";

type Variant = "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  // primary action — crisp solid accent (rationed), no glow. accent-btn fill
  // keeps white-on-blue at WCAG AA in both themes. Instead of a flat opacity
  // hover, a press discharges a jolt into the surrounding dot field (see
  // useJolt) so the instrument acknowledges intent — within size/opacity/colour.
  accent: "bg-accent-btn text-white font-medium active:translate-y-px",
  outline:
    "border border-hairline-strong text-marble hover:border-accent hover:text-accent bg-transparent",
  ghost: "text-marble-dim hover:text-marble hover:bg-raised-2 bg-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2.5",
  // a taller thumb-target for full-bleed mobile CTAs (the voice "Talk" action)
  xl: "h-14 px-8 text-base gap-2.5",
};

const BASE =
  "inline-flex items-center justify-center rounded-sm font-sans transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

// Fire a jolt from a target's bounding-box centre into the shared dot field.
// emitJolt is itself a no-op under prefers-reduced-motion.
function joltFromEl(el: HTMLElement | null, strength = 1) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  emitJolt({ x: r.left + r.width / 2, y: r.top + r.height / 2, strength });
}

// Wires the accent press-commit: a ripple FROM the button on pointerenter
// (mouse, to guide the eye) and pointerdown (so touch — which never hovers —
// still discharges on press). Returns no-op handlers for non-accent variants.
function useJolt(variant: Variant) {
  const onPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (variant !== "accent" || e.pointerType !== "mouse") return;
      // hover = a strong full-screen wave to guide the eye to the CTA
      joltFromEl(e.currentTarget, 1.4);
    },
    [variant],
  );
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (variant !== "accent") return;
      // press/commit = an even bigger wave across the whole viewport
      joltFromEl(e.currentTarget, 1.9);
    },
    [variant],
  );
  return variant === "accent" ? { onPointerEnter, onPointerDown } : {};
}

type BaseProps = { variant?: Variant; size?: Size; className?: string };

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "accent", size = "md", className = "", ...props }, ref) => {
    const jolt = useJolt(variant);
    return (
      <button
        ref={ref}
        className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...jolt}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

type LinkButtonProps = BaseProps &
  React.ComponentProps<typeof Link>;

export function LinkButton({
  variant = "accent",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  const jolt = useJolt(variant);
  return (
    <Link
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...jolt}
      {...props}
    />
  );
}
