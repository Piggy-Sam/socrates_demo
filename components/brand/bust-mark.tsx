import { BUST_DOTS, BUST_VIEWBOX } from "./bust-dots";

const [, , VW, VH] = BUST_VIEWBOX.split(" ").map(Number);

/**
 * The dot-matrix bust — a radius-modulated halftone of the classical bust,
 * single `currentColor` so it flips with the theme. Generated from the
 * reference by scripts/gen-bust.mjs. The mark of the instrument.
 */
export function BustMark({
  size = 28,
  className = "",
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={BUST_VIEWBOX}
      width={size}
      height={Math.round((size * VH) / VW)}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {BUST_DOTS.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </svg>
  );
}
