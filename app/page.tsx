import { DotMatrix } from "@/components/decor/dot-matrix";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LinkButton } from "@/components/ui/button";

const PRINCIPLES = [
  {
    fig: "FIG.01 · THE METHOD",
    title: "A midwife for thought",
    body: "Socrates delivers nothing of its own. In the old maieutic sense it helps you deliver the idea you didn't know you were carrying — drawing out the half-formed thought until it holds.",
  },
  {
    fig: "FIG.02 · THE DIALECTIC",
    title: "It presses on your reasoning",
    body: "Where an answer engine resolves, this interrogates. The naive question, the contradiction held up gently, the assumption named — the structure of your thinking, stress-tested.",
  },
  {
    fig: "FIG.03 · THE RECORD",
    title: "The shape of your mind",
    body: "Everything you work out becomes a point in the field. What you keep returning to rises to the surface — the evolving record of a mind examining itself.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* the living dot-matrix — the one decorative language */}
      <div className="fixed inset-0 -z-10">
        <DotMatrix />
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

      {/* hero — the wordmark, big and centre */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* soft scrim so the centerpiece reads over the live field */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[120%] w-[min(900px,92vw)] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, var(--ink) 35%, transparent 78%)",
          }}
        />

        <div className="relative flex flex-col items-center">
          <p className="label-mono mb-9 flex items-center gap-2 animate-[fade-rise_0.7s_var(--ease-instrument)_both]">
            <span aria-hidden>&gt;</span>
            An instrument for the examined life
          </p>

          <div className="mb-7 animate-[fade-rise_0.7s_var(--ease-instrument)_0.05s_both]">
            <BustMark size={132} className="text-marble" />
          </div>

          {/* the wordmark — BIG and centre */}
          <div className="animate-[fade-rise_0.7s_var(--ease-instrument)_0.1s_both]">
            <Wordmark size="xl" href={null} withStar={false} />
          </div>

          <h1 className="mt-10 max-w-2xl font-display text-2xl font-light leading-snug tracking-tight text-balance text-marble-dim sm:text-3xl">
            It doesn&apos;t hand you answers.{" "}
            <span className="text-marble">It sharpens your own.</span>
          </h1>

          <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
            A thinking instrument modeled on the Socratic method — it draws out
            the half-formed thought, presses on your reasoning, and keeps the
            record of your mind as it moves. Speak it, or write it.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <LinkButton href="/login" size="lg" variant="gold">
              Begin
            </LinkButton>
            <LinkButton href="/design" size="lg" variant="ghost">
              See the instrument
            </LinkButton>
          </div>
        </div>
      </section>

      {/* what it is — three principles, instrument-flavored */}
      <section className="border-t border-hairline bg-ink/70 px-6 py-16 backdrop-blur-sm sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.fig} className="bg-ink p-7">
              <p className="label-mono text-accent">{p.fig}</p>
              <h2 className="mt-3 font-display text-xl font-normal tracking-tight text-marble">
                {p.title}
              </h2>
              <p className="mt-3 font-sans text-sm leading-relaxed text-marble-dim text-pretty">
                {p.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-5xl font-sans text-sm text-marble-dim">
          Talking is one way in — a daily call, or a voice session the moment a
          thought strikes. Writing is another. The instrument is the same.
        </p>
      </section>

      {/* footer readout */}
      <footer className="flex flex-col items-center gap-2 px-6 py-7 sm:flex-row sm:justify-between sm:px-10">
        <span className="label-mono inline-flex items-center text-marble-dim">
          socrates --examine
          <span
            aria-hidden
            className="cursor-blink ml-1 inline-block h-3 w-1.5 align-middle"
          />
        </span>
        <span className="label-mono text-marble-dim">v0.2 · the instrument</span>
      </footer>
    </main>
  );
}
