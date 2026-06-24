import { LandingField } from "@/components/decor/landing-field";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button, LinkButton } from "@/components/ui/button";
import { PhraseCycler } from "@/components/landing/phrase-cycler";
import { startDemo } from "./demo-actions";

// ── THE OPPOSITE STANCE — the principles, grown from the three on /about ──────
const PRINCIPLES = [
  {
    fig: "FIG.01 · THE METHOD",
    title: "It asks before it answers",
    body: "In the old maieutic sense, Socrates delivers nothing of its own. It draws out the idea you didn't know you were carrying — the naive question, the mirror, the pull to a concrete example — before it ever adds a word.",
  },
  {
    fig: "FIG.02 · THE DIALECTIC",
    title: "It presses on your reasoning",
    body: "Where an answer engine resolves, this interrogates. The contradiction held up gently, the assumption named, the angle you hadn't tried — the structure of your thinking, stress-tested rather than rubber-stamped.",
  },
  {
    fig: "FIG.03 · NO FLATTERY",
    title: "It refuses to grade you",
    body: "It never calls your idea brilliant or bad. Praise summons the inner critic; this stays the one space with no evaluator in it. Truth over comfort — and perspectives where you ask for a verdict.",
  },
];

// ── HOW IT WORKS — the loop, made of the real product surfaces ───────────────
const LOOP = [
  {
    fig: "FIG.04 · VOICE & TEXT",
    title: "Bring a half-formed thought",
    body: "Talk it through out loud, or write it. You don't need it resolved or even articulate — a hunch, a knot, the thing you can't quite name is exactly the right place to start.",
  },
  {
    fig: "FIG.05 · THE DIALOGUE",
    title: "It presses, then draws it out",
    body: "It mirrors, asks the question under your question, names the assumption, brings the relevant fact at its true strength — then gets out of the way and lets you think.",
  },
  {
    fig: "FIG.06 · THE BANK",
    title: "What you work out is kept",
    body: "Every conclusion you reach becomes a point in the field — the bank of your own thoughts. Not the model's answers. Yours, in your words, as you arrived at them.",
  },
  {
    fig: "FIG.07 · PATTERNS",
    title: "Recurring threads surface",
    body: "The tensions you keep returning to, the questions that recur — held up as patterns. It shows you the shape; it never tells you what the shape means.",
  },
  {
    fig: "FIG.08 · THE RECAP",
    title: "The shape, handed back",
    body: "A weekly recap returns the movement of your own thinking to you — quieter and clearer than the week felt — so you can see where your mind actually went.",
  },
  {
    fig: "FIG.09 · RESURFACING",
    title: "Past thinking returns when it's useful",
    body: "When a new thought brushes against an old one, the earlier cognition comes back to meet it. Your reasoning compounds instead of evaporating.",
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
            <LinkButton href="/about" variant="outline" size="sm">
              About
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
          A scrim ground sits over the fixed dot-field so the long-form argument
          stays legible. Sections alternate --ink / --raised-2 grounds, divided
          by hairline rules; accent is rationed to one element per section. */}
      <div className="relative border-t border-hairline bg-ink/85 backdrop-blur-sm">
        {/* 1 · THE PROBLEM — amongst a spring of LLMs */}
        <section className="px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3 text-accent">
              FIG.00 · THE PROBLEM
            </p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              Amongst a spring of language models.
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-12">
              <p className="text-base leading-relaxed text-marble text-pretty sm:text-lg">
                We are in an extraordinary bloom of systems that answer,
                summarise, draft, and decide on your behalf. Almost all of them
                are built to <em className="not-italic text-marble">resolve</em>{" "}
                — to hand you a conclusion as fast as possible, and to keep you
                coming back for the next one. The convenience is real, and it is
                everywhere.
              </p>
              <p className="text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
                But a quiet cost rides along with it. People — students most of
                all — increasingly reach for AI to <em className="not-italic">
                offload</em> the thinking itself: the essay unwritten, the
                argument unmade, the problem never actually sat with. It is fake
                it till you make it, except the making-it never comes. And a mind
                that outsources every hard thought gets weaker at thinking, the
                way a carried limb gets weaker at walking.
              </p>
            </div>
            <p className="mt-10 max-w-2xl border-l-2 border-hairline-strong pl-5 font-display text-lg font-light leading-relaxed tracking-tight text-marble text-pretty">
              The stakes are plain: the tools are now strong enough to let a
              generation&apos;s thinking quietly atrophy. That is the thing worth
              refusing.
            </p>
          </div>
        </section>

        {/* 2 · THE OPPOSITE STANCE — the principles */}
        <section className="border-t border-hairline bg-raised-2/70 px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3">› THE STANCE</p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              Socrates is deliberately the other thing.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
              Not another oracle in the bloom — a whetstone. A midwife for
              thought, in the maieutic sense: it presses your reasoning instead
              of replacing it, and hands the thread back richer than it arrived.
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

            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-marble-dim text-pretty">
              It keeps no streaks or scores, volunteers no verdict on how you
              should live, and is built for its own obsolescence — the aim is
              that you internalise the questions and need it less over time.
            </p>
          </div>
        </section>

        {/* 3 · HOW IT WORKS — the loop */}
        <section className="border-t border-hairline px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3">› THE LOOP</p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              How a thought moves through the instrument.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
              One loop, repeated. You bring something unfinished; it draws the
              thought out; what you work out is kept, surfaced, and returned to
              you — so your reasoning compounds instead of evaporating.
            </p>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
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

        {/* 4 · THE ETHOS — anti-metric */}
        <section className="border-t border-hairline bg-raised-2/70 px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1fr]">
            <div>
              <p className="label-mono mb-3">› THE ETHOS</p>
              <h2 className="text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
                No audience. No evaluator. No score.
              </h2>
            </div>
            <div className="space-y-6">
              <p className="text-base leading-relaxed text-marble text-pretty sm:text-lg">
                There are no streaks here, no counts, no engagement bait, nothing
                to win. Metrics turn thinking into performance, and performance
                summons the very critic that good thinking needs to be free of.
                This is the one place with no one watching and nothing to prove.
              </p>
              <p className="text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
                The machine&apos;s whole job is to return you to your own
                judgment, clearer than you left it. Its memory holds up your
                patterns without telling you what they mean. And it is built to
                be outgrown — measured only by the clarity you leave with, and by
                how little you come to need it.
              </p>
            </div>
          </div>
        </section>

        {/* 5 · THE VISION — what we want for human cognition */}
        <section className="border-t border-hairline px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="label-mono mb-3">› THE VISION</p>
            <h2 className="max-w-3xl text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
              What we want for human cognition.
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-12">
              <p className="text-base leading-relaxed text-marble text-pretty sm:text-lg">
                The best thing this technology can do for the mind is not to
                replace its work but to sharpen its edge. The tools are strong
                enough now to do either — to let thinking atrophy, or to make it
                keener than it has ever been. We are betting, deliberately, on
                the second.
              </p>
              <p className="text-base leading-relaxed text-marble-dim text-pretty sm:text-lg">
                A place where a half-formed thought is safe to grow; where memory
                holds your patterns without ruling on them; where the work stays
                yours. If a generation can think harder because of the tools it
                was handed — not softer — that is the future worth building.
              </p>
            </div>
          </div>
        </section>

        {/* 6 · CLOSING CTA — echo the hero, plus the footer readout */}
        <section className="relative overflow-hidden border-t border-hairline bg-raised-2/70 px-6 py-24 sm:px-10 sm:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="label-mono mb-5 flex items-center gap-2">
              <span aria-hidden>&gt;</span>
              socrates --examine
            </p>
            <h2 className="text-balance font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-[2.5rem]">
              It doesn&apos;t hand you answers.{" "}
              <span className="text-marble-dim">It sharpens your own.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-marble-dim text-pretty">
              An instrument for the examined life — a midwife for the thinking
              you can already call your own.
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
