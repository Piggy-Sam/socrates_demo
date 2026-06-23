import { LandingField } from "@/components/decor/landing-field";
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
    <main className="relative flex flex-col">
      {/* one unified field: ambient dots + the face emerging at #hero-face */}
      <div className="fixed inset-0 -z-10">
        <LandingField faceId="hero-face" />
      </div>

      {/* first screen — fills the viewport so the section below stays below the fold */}
      <div className="flex min-h-dvh flex-col">
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

      {/* hero — the living face (left), the wordmark + tagline + actions (right) */}
      <section className="grid flex-1 items-center gap-4 px-6 py-6 lg:grid-cols-2 lg:gap-10 lg:py-10 lg:px-16">
        {/* spacer — the unified field draws the emerging face into this box */}
        <div
          id="hero-face"
          aria-hidden
          className="order-1 h-[32vh] min-h-[220px] lg:h-[80vh]"
        />

        <div className="relative isolate order-2 flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* diffused scrim — soft separation of the text from the field beneath */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-14 -inset-y-12 -z-10"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--ink) 82%, transparent) 0%, color-mix(in srgb, var(--ink) 58%, transparent) 44%, transparent 75%)",
            }}
          />
          <p className="label-mono mb-5 flex items-center gap-2 animate-[fade-rise_0.7s_var(--ease-instrument)_both]">
            <span aria-hidden>&gt;</span>
            An instrument for the examined life
          </p>

          <div className="animate-[fade-rise_0.7s_var(--ease-instrument)_0.05s_both]">
            <Wordmark size="xl" href={null} withStar={false} />
          </div>

          <h1 className="mt-7 font-display text-xl font-light leading-relaxed tracking-tight text-marble-dim sm:text-[1.7rem]">
            <span className="block sm:whitespace-nowrap">
              It doesn&apos;t hand you answers.
            </span>
            <span className="block text-marble sm:whitespace-nowrap">
              It sharpens your own.
            </span>
          </h1>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <LinkButton href="/login" size="lg" variant="gold">
              Begin
            </LinkButton>
            <LinkButton href="/design" size="lg" variant="ghost">
              See the instrument
            </LinkButton>
          </div>
        </div>
      </section>
      </div>

      {/* what it is — the moved description + three principles */}
      <section className="border-y border-hairline bg-ink/70 px-6 py-16 backdrop-blur-sm sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="max-w-2xl font-sans text-lg leading-relaxed text-marble text-pretty">
            A thinking instrument modeled on the Socratic method — it draws out
            the half-formed thought, presses on your reasoning, and keeps the
            record of your mind as it moves.{" "}
            <span className="text-marble-dim">Speak it, or write it.</span>
          </p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-3">
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
        </div>
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
