import { LandingField } from "@/components/decor/landing-field";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button, LinkButton } from "@/components/ui/button";
import { PhraseCycler } from "@/components/landing/phrase-cycler";
import { startDemo } from "./demo-actions";

// ── THE STANCE — the three principles, condensed ─────────────────────────────
const PRINCIPLES = [
  {
    fig: "FIG.01 · THE METHOD",
    title: "It asks before it answers",
    body: "A midwife, not an oracle. It draws out the idea you were already carrying before it ever adds a word of its own.",
  },
  {
    fig: "FIG.02 · THE DIALECTIC",
    title: "It presses your reasoning",
    body: "Where an answer engine resolves, this interrogates — naming the assumption, holding up the contradiction, stress-testing the structure of your thinking.",
  },
  {
    fig: "FIG.03 · NO FLATTERY",
    title: "It keeps no score",
    body: "No streaks, no grades, no verdict on your idea. Praise summons the inner critic; this stays the one space with no evaluator in it.",
  },
];

// ── HOW IT WORKS — the loop, condensed to four tight steps ────────────────────
const LOOP = [
  {
    fig: "FIG.04 · BRING",
    title: "Bring a half-formed thought",
    body: "Speak it or write it — a hunch, a knot, the thing you can't quite name is exactly the right place to start.",
  },
  {
    fig: "FIG.05 · PRESS",
    title: "It presses and draws it out",
    body: "It mirrors, asks the question under your question, brings the relevant fact at its true strength — then lets you think.",
  },
  {
    fig: "FIG.06 · KEEP",
    title: "Your thinking is kept",
    body: "Each conclusion becomes a point in the bank — your reasoning, in your words, not the model's answers.",
  },
  {
    fig: "FIG.07 · RETURN",
    title: "Patterns and recap return it",
    body: "Recurring threads surface and a weekly recap hands the movement of your thinking back — so it compounds instead of evaporating.",
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
            <LinkButton href="/pitch" variant="outline" size="sm">
              Pitch
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

            {/* the tagline: a fixed prefix + the vertical phrase wheel, on one
                baseline. Type scale matches the old two-line h1 exactly so the
                hero doesn't reflow when this swapped in. */}
            <h1 className="mt-7 max-w-full font-display text-xl font-light leading-relaxed tracking-tight text-marble-dim animate-[fade-rise_0.7s_var(--ease-instrument)_0.1s_both] sm:text-[1.7rem]">
              <span className="flex flex-nowrap items-center justify-center gap-x-[0.6em] whitespace-nowrap lg:justify-start">
                <span className="whitespace-nowrap text-marble-dim">
                  The midwife for
                </span>
                <PhraseCycler />
              </span>
            </h1>

            {/* the core line — one crisp sentence so a first-time visitor
                instantly gets it, sitting between the tagline wheel and the CTAs.
                Sized to sit on a single line in the hero. */}
            <p className="mt-5 font-display text-sm font-light leading-relaxed tracking-tight text-marble animate-[fade-rise_0.7s_var(--ease-instrument)_0.15s_both] sm:text-base">
              AI that sharpens your thinking instead of replacing it.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <LinkButton href="/login" size="lg" variant="accent">
                Begin
              </LinkButton>
              {/* See demo is the secondary action — a live, fully-populated
                  account anyone can explore with no sign-up. */}
              <form action={startDemo} className="contents">
                <Button type="submit" size="lg" variant="outline">
                  See demo
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* ─────────────────────────── THE PRODUCT ──────────────────────────────
          A scrim ground sits over the fixed dot-field so the argument stays
          legible. Four tight sections, framed around human agency in
          AI-mediated decisions. Sections alternate --ink / --raised-2 grounds,
          divided by hairline rules; accent is rationed to one element each. */}
      <div className="relative border-t border-hairline bg-ink/85 backdrop-blur-sm">
        {/* 1 · THE PROBLEM — the thinking gets offloaded */}
        <section className="px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3 text-accent">
              FIG.00 · THE PROBLEM
            </p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              Answer-engines resolve. You stop thinking.
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-marble text-pretty sm:text-lg">
              Today&apos;s AI is built to hand you a conclusion as fast as
              possible. So people — students most of all — quietly offload the
              thinking itself: the argument unmade, the problem never sat with.
            </p>
            <p className="mt-5 max-w-3xl border-l-2 border-hairline-strong pl-5 font-display text-lg font-light leading-relaxed tracking-tight text-marble text-pretty">
              And you cannot understand, override, or shape a decision you&apos;ve
              stopped thinking about. Agency is the first thing to atrophy.
            </p>
          </div>
        </section>

        {/* 2 · THE STANCE — the opposite, in three principles */}
        <section className="border-t border-hairline bg-raised-2/70 px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3">› THE STANCE</p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              Socrates is the opposite — a midwife, not an oracle.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
              It asks before it answers, presses your reasoning instead of
              replacing it, never flatters, and keeps no score.
            </p>

            <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.fig} className="bg-ink p-7">
                  <p className="label-mono text-accent">{p.fig}</p>
                  <h3 className="mt-3 font-display text-xl font-normal tracking-tight text-marble">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-marble-dim text-pretty">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 · HOW IT WORKS — the loop, condensed */}
        <section className="border-t border-hairline px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3">› HOW IT WORKS</p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              One loop that keeps the thinking yours.
            </h2>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              {LOOP.map((step) => (
                <li key={step.fig} className="bg-ink p-7">
                  <p className="label-mono text-marble-dim">{step.fig}</p>
                  <h3 className="mt-3 font-display text-lg font-normal tracking-tight text-marble">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-marble-dim text-pretty">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 · THE BET — vision + closing CTA, with the footer readout below */}
        <section className="relative overflow-hidden border-t border-hairline bg-raised-2/70 px-6 py-24 sm:px-10 sm:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="label-mono mb-5 flex items-center gap-2">
              <span aria-hidden>&gt;</span>
              THE BET
            </p>
            <h2 className="text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-[2.5rem]">
              A generation that thinks harder because of its tools{" "}
              <span className="text-marble-dim">— not softer.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-marble-dim text-pretty">
              No audience, no evaluator, no score — the one place with nothing to
              prove, built to return you to your own judgment and then be
              outgrown.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <LinkButton href="/login" size="lg" variant="accent">
                Begin
              </LinkButton>
              <form action={startDemo} className="contents">
                <Button type="submit" size="lg" variant="outline">
                  See demo
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* footer readout */}
        <footer className="flex flex-col items-center gap-2 border-t border-hairline px-6 py-7 sm:flex-row sm:justify-between sm:px-10">
          <span className="label-mono inline-flex items-center text-marble-dim">
            socrates --examine
            <span
              aria-hidden
              className="cursor-blink ml-1 inline-block h-3 w-1.5 align-middle"
            />
          </span>
          <span className="label-mono text-marble-dim">
            v0.2 · the instrument
          </span>
        </footer>
      </div>
    </main>
  );
}
