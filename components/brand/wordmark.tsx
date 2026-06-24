import Link from "next/link";
import { BustMark } from "./bust-mark";

/** A tiny dot-cluster glyph — Socrates' mark in miniature (echoes the bust). */
export function StarMark({
  className = "",
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="currentColor"
      aria-hidden
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <circle cx="3" cy="3" r="1.6" />
      <circle cx="7" cy="3" r="1.1" />
      <circle cx="3" cy="7" r="1.1" />
      <circle cx="7" cy="7" r="1.6" />
    </svg>
  );
}

/** The blinking terminal block cursor. */
export function BlinkCursor({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`cursor-blink ml-1 inline-block align-[-0.08em] ${className}`}
      style={{ width: "0.5em", height: "0.95em" }}
    />
  );
}

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  /** show the bust mark (kept name for back-compat with existing callers) */
  withStar?: boolean;
};

const TEXT = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl sm:text-3xl",
  xl: "text-4xl sm:text-6xl",
} as const;

const MARK = { sm: 18, md: 24, lg: 40, xl: 64 } as const;
const GAP = { sm: "gap-2.5", md: "gap-2.5", lg: "gap-3", xl: "gap-4" } as const;

/**
 * Socrates AI wordmark — dot-matrix face + "SOCRATES" in Plex Mono caps, with
 * "AI" and the blinking cursor in the blue accent.
 */
export function Wordmark({
  className = "",
  size = "md",
  href = "/",
  withStar = true,
}: Props) {
  const inner = (
    <span className={`inline-flex items-center ${GAP[size]} ${className}`}>
      {withStar && (
        <BustMark size={MARK[size]} className="bust-mark shrink-0 text-marble" />
      )}
      <span
        className={`inline-flex items-center font-mono-display font-medium uppercase tracking-[0.18em] text-marble ${TEXT[size]}`}
      >
        Socrates<span className="ml-[0.4em] text-accent">AI</span>
        <BlinkCursor />
      </span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link
      href={href}
      aria-label="Socrates AI — home"
      className="wordmark-link inline-flex rounded-sm outline-none"
    >
      {inner}
    </Link>
  );
}
