import Link from "next/link";

/** The star ident — a small gold point of light, the lamp of inquiry. */
export function StarMark({
  className = "",
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, var(--gold-lit), var(--gold) 60%, transparent 72%)",
          boxShadow: "0 0 10px 1px rgb(var(--star-glow) / 0.6)",
        }}
      />
    </span>
  );
}

type Props = {
  className?: string;
  /** size of the brand text */
  size?: "sm" | "md" | "lg";
  href?: string | null;
  withStar?: boolean;
};

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl sm:text-5xl",
} as const;

/** Socrates wordmark — Fraunces, optical, with the gold star ident. */
export function Wordmark({
  className = "",
  size = "md",
  href = "/",
  withStar = true,
  ...rest
}: Props & React.HTMLAttributes<HTMLElement>) {
  const inner = (
    <span
      className={`inline-flex items-baseline gap-2 font-display font-medium tracking-tight text-marble ${SIZES[size]} ${className}`}
      {...rest}
    >
      {withStar && (
        <StarMark
          size={size === "lg" ? 16 : size === "md" ? 11 : 9}
          className="self-center"
        />
      )}
      <span>
        Socrates<span className="text-gold"> AI</span>
      </span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link
      href={href}
      aria-label="Socrates AI — home"
      className="rounded-sm outline-none transition-opacity hover:opacity-90"
    >
      {inner}
    </Link>
  );
}
