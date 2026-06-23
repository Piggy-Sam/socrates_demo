"use client";

import { useState } from "react";
import { DotMatrix } from "@/components/decor/dot-matrix";
import {
  BreathingStar,
  type StarState,
} from "@/components/sky/breathing-star";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

const SWATCHES: { name: string; var: string; note: string }[] = [
  { name: "ink", var: "--ink", note: "paper ground" },
  { name: "raised", var: "--raised", note: "surface" },
  { name: "raised-2", var: "--raised-2", note: "well · code" },
  { name: "hairline", var: "--hairline", note: "rules" },
  { name: "hairline-strong", var: "--hairline-strong", note: "rules+" },
  { name: "marble", var: "--marble", note: "ink text" },
  { name: "marble-dim", var: "--marble-dim", note: "muted" },
  { name: "accent", var: "--accent", note: "the one blue" },
  { name: "accent-strong", var: "--accent-strong", note: "hover · active" },
];

const STAR_STATES: StarState[] = [
  "idle",
  "listening",
  "speaking",
  "thinking",
  "ended",
];

const PRINCIPLES: { id: string; text: string }[] = [
  {
    id: "ASKS BEFORE IT ANSWERS",
    text: "It draws out your own thinking first — the naive question, the mirror, the pull to a concrete example — before it ever adds its own.",
  },
  {
    id: "GROUNDED IN REALITY",
    text: "It brings real facts and evidence, calibrated to their true strength, and names its sources. Truth over comfort.",
  },
  {
    id: "NO FLATTERY",
    text: "It never grades your ideas as brilliant or bad. Praise summons the inner critic; this stays the one space with no evaluator in it.",
  },
  {
    id: "PERSPECTIVES, NOT VERDICTS",
    text: "Asked for a view, it offers angles and a tentative take — never a ruling on how you should live. Your reaction is the point.",
  },
  {
    id: "NO METRICS",
    text: "No streaks, counts, or engagement bait. It is measured only by the clarity you leave with.",
  },
  {
    id: "BUILT TO BE OUTGROWN",
    text: "Its aim is your independence: that you internalise the questions and need it less over time.",
  },
];

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline py-14">
      <p className="label-mono mb-2">{label}</p>
      <h2 className="mb-8 text-3xl font-light tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignLab() {
  const [starState, setStarState] = useState<StarState>("idle");

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 sm:px-8">
      <header className="flex items-center justify-between border-b border-hairline py-6">
        <Wordmark size="sm" />
        <div className="flex items-center gap-3">
          <span className="label-mono hidden sm:inline">About</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="py-10">
        <p className="label-mono mb-3 flex items-center gap-2">
          <span aria-hidden>&gt;</span>
          About · the instrument
        </p>
        <h1 className="max-w-2xl text-4xl font-light leading-tight tracking-tight text-balance sm:text-5xl">
          A scientific instrument for the examined life.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-marble-dim text-pretty">
          Light-first, high contrast, hairline rules, one profound blue, and a
          dot-matrix motif throughout. Terminal cues are the delight in the
          details — never kitsch.
        </p>
      </div>

      {/* PALETTE */}
      <Section label="01 · Palette" title="Paper, ink, one blue">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SWATCHES.map((s) => (
            <div
              key={s.var}
              className="overflow-hidden rounded-md border border-hairline"
            >
              <div
                className="h-20 w-full border-b border-hairline"
                style={{ background: `var(${s.var})` }}
              />
              <div className="flex items-baseline justify-between bg-raised px-3 py-2">
                <span className="font-mono text-xs text-marble">{s.name}</span>
                <span className="font-mono text-2xs text-marble-dim">
                  {s.note}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-marble-dim">
          Exactly one accent — a profound blue — rationed to a single focal
          element per view. The retired warm gold and cool cyan now resolve to
          the accent alias, so legacy utilities keep compiling and render blue.
        </p>
      </Section>

      {/* TYPE */}
      <Section label="02 · Typography" title="Two families, three voices">
        <div className="space-y-8">
          <Specimen role="Brand · titles · IBM Plex Mono" cls="font-mono-display">
            <p className="text-4xl font-medium uppercase tracking-[0.18em]">
              Socrates
            </p>
            <p className="label-mono mt-3">
              FIG. labels · section ids · timestamps · the wordmark
            </p>
          </Specimen>
          <Specimen role="Body + UI · Geist" cls="font-sans">
            <p className="max-w-2xl text-lg leading-relaxed">
              The person&apos;s own half-formed thought matters more than
              anything Socrates could say. Reading, summaries, chat, and chrome
              all set in Geist — clean, modern, quietly confident.
            </p>
          </Specimen>
          <Specimen role="Data · Geist Mono" cls="">
            <p
              className="text-sm tracking-wide text-marble-dim"
              style={{ fontFamily: "var(--font-geist-mono-raw)" }}
            >
              IDEA · 2026-06-22 · 03:14 · SESSION 0xA17 · RECURRENCE ×3
            </p>
          </Specimen>
        </div>
      </Section>

      {/* THE BREATHING STAR */}
      <Section label="03 · Presence" title="The dot-matrix orb">
        <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="max-w-md text-marble-dim">
              Socrates&apos; presence is a dot-matrix orb that breathes in a
              calm wave rippling out from the center — never a VU meter.
              Distinct, quiet states for listening, speaking, and thinking.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {STAR_STATES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={starState === s ? "gold" : "outline"}
                  onClick={() => setStarState(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <p className="label-mono mt-4">state · {starState}</p>
          </div>
          <div className="flex justify-center rounded-lg border border-hairline bg-raised p-10">
            <BreathingStar state={starState} size={180} />
          </div>
        </div>
      </Section>

      {/* THE LIVING DOT-MATRIX */}
      <Section label="04 · Signature" title="The living dot-matrix">
        <p className="mb-5 max-w-xl text-marble-dim">
          The one decorative language. A faint field of dots breathes in slow
          overlapping waves and comes alive around the pointer — dots brighten,
          swell, and are gently repelled, like a lens passing over the field.
          Move your cursor across it.
        </p>
        <div className="relative h-80 overflow-hidden rounded-md border border-hairline bg-ink">
          <DotMatrix />
        </div>
      </Section>

      {/* THE MARK + CONTROLS */}
      <Section label="05 · Mark & controls" title="The bust, wordmark & buttons">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <p className="label-mono mb-4">Dot-matrix bust · legibility</p>
            <div className="flex flex-wrap items-end gap-8 rounded-md border border-hairline bg-raised p-8 text-marble">
              <div className="flex flex-col items-center gap-2">
                <BustMark size={16} title="Socrates mark, 16px" />
                <span className="label-mono">16</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <BustMark size={32} title="Socrates mark, 32px" />
                <span className="label-mono">32</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <BustMark size={180} title="Socrates mark, 180px" />
                <span className="label-mono">180</span>
              </div>
            </div>
            <div className="mt-6">
              <p className="label-mono mb-4">Wordmark</p>
              <div className="rounded-md border border-hairline bg-raised p-8">
                <Wordmark size="lg" href={null} />
              </div>
            </div>
          </div>

          <div>
            <p className="label-mono mb-4">Buttons · state</p>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-raised p-8">
              <Button variant="gold">Begin</Button>
              <Button variant="outline">Write it</Button>
              <Button variant="ghost">Later</Button>
              <Button variant="gold" disabled>
                Disabled
              </Button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-marble-dim">
              The solid accent button is the one focal action, rationed per
              view. Outline and ghost carry the secondary paths.
            </p>
          </div>
        </div>
      </Section>

      {/* ─────────── ABOUT · VALUES, PRINCIPLES, DNA, VISION ─────────── */}

      {/* THE SOUL */}
      <Section label="06 · The soul" title="A midwife of thought">
        <div className="grid gap-6 sm:grid-cols-2">
          <p className="text-lg leading-relaxed text-marble">
            Socrates delivers nothing of its own. In the old maieutic sense it
            helps you deliver the idea you didn&apos;t know you were carrying
            &mdash; drawing out the half-formed thought until it holds. Its
            governing belief is plain and unyielding: your own half-formed
            thought is more interesting, and more important, than anything
            Socrates could say.
          </p>
          <p className="text-base leading-relaxed text-marble-dim">
            So it is not an assistant and not an oracle. It is a thinking
            partner &mdash; a sharp friend on a night walk who actually has
            things to say, and knows when to get out of the way and let you
            think. It asks, mirrors, and presses; it brings the relevant fact
            and the angle you hadn&apos;t tried; then it hands the thread back,
            richer than it arrived. The point is always your clarity, never its
            own last word.
          </p>
        </div>
      </Section>

      {/* PRINCIPLES */}
      <Section label="07 · Principles" title="What it will and won't do">
        <ul className="grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <li key={p.id} className="bg-ink p-5">
              <p className="label-mono mb-1.5 text-accent">{p.id}</p>
              <p className="font-sans leading-relaxed text-marble">{p.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* DNA */}
      <Section label="08 · DNA" title="Form follows the philosophy">
        <p className="max-w-2xl text-base leading-relaxed text-marble-dim">
          The look is not decoration; it is the argument made visible. One
          rationed blue, because attention is precious and should fall on a
          single thing at a time. Hairline rules and mono captions, because an
          instrument is calibrated, not loud. And the dot-matrix &mdash; the
          only decorative language &mdash; carries every living surface: motion
          through size, opacity, and colour rather than restless movement;
          always on, quietly chaotic, brightening only where your attention
          (the cursor) falls. A field that is alive but never demanding &mdash;
          the same restraint we ask of the conversation itself.
        </p>
      </Section>

      {/* POSITIONING — TODAY, AMONGST THE BLOOM */}
      <Section label="09 · Today" title="Amongst a spring of LLMs">
        <div className="grid gap-6 sm:grid-cols-2">
          <p className="text-base leading-relaxed text-marble-dim">
            We are in a spring of language models &mdash; an extraordinary bloom
            of systems that answer, summarise, draft, and decide on your behalf.
            Most are built to <em className="not-italic text-marble">resolve</em>
            : to hand you a conclusion as fast as possible, and often to keep you
            coming back for the next one. The convenience is real. But there is a
            quiet cost &mdash; a mind that outsources every hard thought gets
            weaker at thinking, the way a carried limb gets weaker at walking.
          </p>
          <p className="text-base leading-relaxed text-marble">
            Socrates is deliberately the other thing. Where an answer engine
            resolves, this interrogates. It refuses to flatter, refuses to
            gamify, keeps no streaks or scores, and volunteers no verdict on how
            you should live. It is even built for its own obsolescence &mdash;
            the aim is that you internalise the questions and need it less over
            time. Not another oracle in the bloom; a whetstone.
          </p>
        </div>
      </Section>

      {/* VISION */}
      <Section label="10 · Vision" title="What we want for human cognition">
        <p className="mb-4 max-w-2xl text-lg leading-relaxed text-marble">
          We think the best thing this technology can do for the mind is not to
          replace its work but to sharpen its edge. The tools are strong enough
          now to do either &mdash; to let thinking quietly atrophy, or to make
          it keener than it has ever been. We are betting on the second.
        </p>
        <p className="max-w-2xl text-base leading-relaxed text-marble-dim">
          An instrument for the examined life: a place with no audience and no
          evaluator, where a half-formed thought is safe to grow; where memory
          holds up your patterns without telling you what they mean; where the
          machine&apos;s whole job is to return you to your own judgment,
          clearer than you left it. If a generation can think harder because of
          the tools it was handed &mdash; not softer &mdash; that is the future
          worth building.
        </p>
      </Section>

      <footer className="flex items-center justify-between border-t border-hairline pt-8">
        <span className="label-mono text-marble-dim">
          socrates --examine · v0.2
        </span>
      </footer>
    </main>
  );
}

function Specimen({
  role,
  cls,
  children,
}: {
  role: string;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:gap-6">
      <p className="label-mono pt-1">{role}</p>
      <div className={cls}>{children}</div>
    </div>
  );
}
