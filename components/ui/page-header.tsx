import type { ReactNode } from "react";

// The one page-title scale, shared across the top-level surfaces (bank, today,
// calls, recap, chat) so titles never drift in size or weight. A FIG.-style mono
// kicker leads with the terminal caret — the single quiet accent touch in the
// header; the title itself stays in marble so the page's one rationed accent is
// spent elsewhere (the orb, the primary action, the field).
export function PageHeader({
  kicker,
  title,
  intro,
  className = "",
}: {
  kicker: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      <p className="label-mono mb-3">
        <span className="text-accent">&rsaquo;</span> {kicker}
      </p>
      <h1 className="text-balance font-display text-3xl font-light tracking-tight text-marble sm:text-4xl">
        {title}
      </h1>
      {intro ? (
        <p className="mt-4 max-w-xl font-sans text-lg leading-relaxed text-marble-dim text-pretty">
          {intro}
        </p>
      ) : null}
    </header>
  );
}
