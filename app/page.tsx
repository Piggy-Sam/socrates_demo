import { Constellation } from "@/components/sky/constellation";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark, BlinkCursor } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LinkButton } from "@/components/ui/button";
import { SAMPLE_SKY } from "@/lib/sample-sky";

const PRINCIPLES: { fig: string; head: string; body: string }[] = [
  {
    fig: "FIG.01 — THE METHOD",
    head: "A midwife for thought",
    body: "Socrates delivers nothing of his own. He asks, mirrors, and mostly stays quiet — drawing the half-formed thought into the open so you can see what you actually think.",
  },
  {
    fig: "FIG.02 — THE DIALECTIC",
    head: "It presses on your reasoning",
    body: "Where an answer engine resolves the question, the instrument keeps it open. It surfaces the contradiction, asks for the concrete example, and lets you supply the meaning.",
  },
  {
    fig: "FIG.03 — THE RECORD",
    head: "The field of your mind",
    body: "Every thought becomes a plotted point. Recurring themes draw hairline rules between them, and the field grows — a record of your reasoning as it moves, not a feed.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* the dot-matrix field — a faint, ambient backdrop behind the hero */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Constellation
          stars={SAMPLE_SKY}
          interactive={false}
          framed={false}
          igniteDuration={2.2}
          className="opacity-50"
        />
        {/* clean fade to paper at the edges — keeps the type crisp */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 75% at 50% 38%, transparent 35%, var(--ink) 90%)",
          }}
        />
      </div>

      {/* nav */}
      <header className="flex items-center justify-between border-b border-hairline px-6 py-5 sm:px-10">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-2.5">
          <ThemeToggle />
          <LinkButton href="/design" variant="outline" size="sm">
            Design system
          </LinkButton>
        </nav>
      </header>

      {/* hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
        <p className="label-mono mb-10 animate-[fade-rise_0.7s_var(--ease-instrument)_both]">
          &gt; An instrument for the examined life
        </p>

        <div className="mb-10 animate-[ignite_1.1s_var(--ease-instrument)_both] text-marble">
          <BustMark size={132} title="Socrates" />
        </div>

        <h1 className="max-w-3xl text-5xl font-light leading-[1.04] tracking-tight text-balance sm:text-7xl">
          It doesn&apos;t hand you answers.
          <br />
          <span className="text-accent">It sharpens your own.</span>
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-marble-dim text-pretty sm:text-xl">
          A thinking instrument modeled on the Socratic method — it draws out
          the half-formed thought, presses on your reasoning, and keeps the
          record of your mind as it moves. Speak it, or write it.
        </p>

        <div className="mt-11 flex flex-col items-center gap-3 sm:flex-row">
          <LinkButton href="/login" size="lg" variant="gold">
            Begin
          </LinkButton>
          <LinkButton href="/design" size="lg" variant="ghost">
            See the instrument
          </LinkButton>
        </div>
      </section>

      {/* what it is — terminal-flavored principle readout */}
      <section className="border-t border-hairline bg-raised/40 px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="label-mono mb-10 flex items-center gap-2">
            <span aria-hidden>$</span>
            socrates --what-it-is
          </p>
          <div className="grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <article
                key={p.fig}
                className="flex flex-col bg-ink p-6 sm:p-7"
              >
                <p className="label-mono text-accent">{p.fig}</p>
                <h2 className="mt-4 text-xl font-medium tracking-tight text-marble">
                  {p.head}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-marble-dim text-pretty">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-marble-dim text-pretty">
            Voice and writing are simply ways in. The point is not a machine to
            talk to — it is your own thinking, made sharper.
          </p>
        </div>
      </section>

      {/* instrument footer readout */}
      <footer className="flex flex-col items-center gap-3 border-t border-hairline px-6 py-7 sm:flex-row sm:justify-between sm:px-10">
        <span className="label-mono inline-flex items-center text-marble-dim">
          socrates --examine
          <BlinkCursor />
        </span>
        <span className="label-mono text-marble-dim">v0.2</span>
      </footer>
    </main>
  );
}
