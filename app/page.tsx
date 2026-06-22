import Link from "next/link";
import { Constellation } from "@/components/sky/constellation";
import { BreathingStar } from "@/components/sky/breathing-star";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LinkButton } from "@/components/ui/button";
import { SAMPLE_SKY } from "@/lib/sample-sky";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* the night sky, full-bleed and ambient behind everything */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Constellation
          stars={SAMPLE_SKY}
          interactive={false}
          framed={false}
          igniteDuration={2.2}
          className="opacity-70"
        />
        {/* vignette to ink at the edges — keeps the type legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 70% at 50% 42%, transparent 30%, var(--ink) 92%)",
          }}
        />
      </div>

      {/* nav */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-2.5">
          <ThemeToggle />
          <LinkButton href="/design" variant="outline" size="sm">
            Design system
          </LinkButton>
        </nav>
      </header>

      {/* hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="label-mono mb-10 animate-[fade-rise_0.7s_var(--ease-instrument)_both]">
          An instrument for the examined life
        </p>

        <div className="mb-10 animate-[ignite_1.1s_var(--ease-instrument)_both]">
          <BreathingStar state="idle" size={140} />
        </div>

        <h1 className="max-w-3xl font-display text-5xl font-light leading-[1.05] tracking-tight text-balance sm:text-7xl">
          Think out loud.{" "}
          <em className="font-normal italic text-gold">Know thyself.</em>
        </h1>

        <p className="mt-7 max-w-xl font-serif text-lg leading-relaxed text-marble-dim text-pretty sm:text-xl">
          A voice that calls you each day and helps you reach your own clarity —
          drawing out half-formed thoughts, asking the question that cracks them,
          and keeping the evolving record of your mind.
        </p>

        <div className="mt-11 flex flex-col items-center gap-3 sm:flex-row">
          {/* the breathing star above is the one gold focal point — keep the
              CTA outline so it doesn't compete (SPEC §9 gold rationing) */}
          <LinkButton href="/login" size="lg" variant="outline">
            Begin the dialogue
          </LinkButton>
          <LinkButton href="/design" size="lg" variant="ghost">
            See the instrument
          </LinkButton>
        </div>
      </section>

      {/* instrument footer readout */}
      <footer className="flex flex-col items-center gap-2 px-6 py-7 sm:flex-row sm:justify-between sm:px-10">
        <span className="label-mono text-marble-dim">
          Aegean Night · v0.1 · Maieutic Engine
        </span>
        <span className="label-mono text-marble-dim">
          <Link
            href="/design"
            className="rounded-sm transition-colors hover:text-gold"
          >
            ✦ The constellation of your mind
          </Link>
        </span>
      </footer>
    </main>
  );
}
