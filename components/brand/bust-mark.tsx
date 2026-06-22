import { BUST_DOTS_COARSE, BUST_VIEWBOX_COARSE } from "./bust-dots";

const [, , VW, VH] = BUST_VIEWBOX_COARSE.split(" ").map(Number);

/**
 * The small dot-matrix mark of Socrates' face (coarse set, crisp at logo sizes),
 * single `currentColor`. Carries the dynamism DNA via a gentle per-dot opacity
 * shimmer (disabled under prefers-reduced-motion by the global rule).
 */
export function BustMark({
  size = 28,
  className = "",
  title,
  animated = true,
}: {
  size?: number;
  className?: string;
  title?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox={BUST_VIEWBOX_COARSE}
      width={size}
      height={Math.round((size * VH) / VW)}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {BUST_DOTS_COARSE.map(([cx, cy, r], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          style={
            animated
              ? {
                  animation: `dot-pulse ${(2.6 + (i % 5) * 0.5).toFixed(2)}s ease-in-out infinite`,
                  animationDelay: `${((i * 0.21) % 3).toFixed(2)}s`,
                }
              : undefined
          }
        />
      ))}
    </svg>
  );
}
