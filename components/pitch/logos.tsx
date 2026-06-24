// ─────────────────────────────────────────────────────────────────────────────
// BRAND LOGOS — inline, monochrome SVG marks for the closing "BUILT WITH" slide.
// Each takes `currentColor` so the deck's theme (marble / accent) drives the
// colour; no external assets, so they print cleanly in the PDF contingency.
// Recognizable marks where we're confident of the path (OpenAI blossom, Vercel
// triangle, Next.js mark, Supabase bolt); a tasteful brand-styled wordmark where
// an exact glyph is uncertain (ElevenLabs bars, Twilio) — still unmistakable.
// ─────────────────────────────────────────────────────────────────────────────

type LogoProps = { className?: string; title?: string };

/** OpenAI — the six-petal "blossom". */
export function OpenAILogo({ className = "", title = "OpenAI" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071.007L4.05 13.94a4.5 4.5 0 0 1-1.71-6.045zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071-.007l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

/** ElevenLabs — the two-bar "II" mark. */
export function ElevenLabsLogo({
  className = "",
  title = "ElevenLabs",
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect x="6.5" y="2" width="3.4" height="20" rx="0.4" />
      <rect x="14.1" y="2" width="3.4" height="20" rx="0.4" />
    </svg>
  );
}

/** Supabase — the lightning bolt. */
export function SupabaseLogo({ className = "", title = "Supabase" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M13.976 1.072 5.354 11.49c-.582.704-.073 1.764.842 1.764h6.235v8.638c0 .997 1.275 1.426 1.879.629l8.622-10.418c.582-.704.073-1.764-.842-1.764h-6.235V1.7c0-.997-1.276-1.426-1.879-.629z" />
    </svg>
  );
}

/** Vercel — the triangle. */
export function VercelLogo({ className = "", title = "Vercel" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M12 1.5 23.5 21.5H.5L12 1.5z" />
    </svg>
  );
}

/** Next.js — the circular "N" mark. */
export function NextjsLogo({ className = "", title = "Next.js" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M11.214.006c-.052.005-.216.022-.364.033C7.442.347 4.25 2.186 2.225 5.013a11.88 11.88 0 0 0-2.118 5.243c-.096.66-.108.854-.108 1.748s.012 1.089.108 1.748c.652 4.507 3.86 8.293 8.209 9.696.779.251 1.6.422 2.533.526.364.04 1.936.04 2.3 0 1.611-.179 2.977-.578 4.323-1.265.207-.105.247-.134.219-.157-.02-.014-.899-1.194-1.955-2.62l-1.919-2.593-2.404-3.559a342.499 342.499 0 0 0-2.422-3.556c-.009-.003-.018 1.578-.023 3.51-.007 3.38-.01 3.516-.052 3.596a.426.426 0 0 1-.206.213c-.075.038-.14.045-.495.045H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.097-.063a12.318 12.318 0 0 0 2.465-2.163 11.947 11.947 0 0 0 2.825-6.135c.096-.66.108-.854.108-1.748s-.012-1.088-.108-1.748C23.24 5.75 20.032 1.963 15.683.56a12.6 12.6 0 0 0-2.498-.523A33.119 33.119 0 0 0 11.214.006zm4.673 7.25c.388 0 .457.005.535.043a.437.437 0 0 1 .222.24c.013.034.016 1.652.013 5.314l-.005 5.266-.928-1.422-.93-1.422v-3.828c0-2.476.008-3.86.018-3.918a.448.448 0 0 1 .216-.278c.072-.038.099-.042.524-.042z" />
    </svg>
  );
}

/** Twilio — the rounded mark with four dots. */
export function TwilioLogo({ className = "", title = "Twilio" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 20.547c-4.717 0-8.547-3.83-8.547-8.547S7.283 3.453 12 3.453 20.547 7.283 20.547 12 16.717 20.547 12 20.547zm5.293-11.234a2.293 2.293 0 1 1-4.586 0 2.293 2.293 0 0 1 4.586 0zm0 5.374a2.293 2.293 0 1 1-4.586 0 2.293 2.293 0 0 1 4.586 0zm-5.373 0a2.293 2.293 0 1 1-4.587 0 2.293 2.293 0 0 1 4.587 0zm0-5.374a2.293 2.293 0 1 1-4.587 0 2.293 2.293 0 0 1 4.587 0z" />
    </svg>
  );
}
