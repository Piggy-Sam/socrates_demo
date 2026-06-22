"use client";

import { useState } from "react";
import { Constellation } from "@/components/sky/constellation";
import {
  BreathingStar,
  type StarState,
} from "@/components/sky/breathing-star";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { SAMPLE_SKY } from "@/lib/sample-sky";
import type { SkyStar } from "@/lib/constellation";

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
  const [selected, setSelected] = useState<SkyStar | null>(null);

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 sm:px-8">
      <header className="flex items-center justify-between border-b border-hairline py-6">
        <Wordmark size="sm" />
        <div className="flex items-center gap-3">
          <span className="label-mono hidden sm:inline">Design system</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="py-10">
        <p className="label-mono mb-3 flex items-center gap-2">
          <span aria-hidden>&gt;</span>
          The instrument · reference
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

      {/* THE CONSTELLATION */}
      <Section label="04 · Signature" title="The dot-matrix field">
        <p className="mb-5 max-w-xl text-marble-dim">
          Each thought is a plotted dot; recurring themes draw hairline rules
          between them; the field grows over time. Hover a dot to read it.
        </p>
        <Constellation
          stars={SAMPLE_SKY}
          selectedId={selected?.id ?? null}
          onSelect={(s) => setSelected(s)}
        />
        {selected && (
          <div className="mt-4 rounded-md border border-hairline bg-raised p-4">
            <p className="label-mono text-accent">{selected.type}</p>
            <p className="mt-1 text-marble">{selected.content}</p>
          </div>
        )}
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
