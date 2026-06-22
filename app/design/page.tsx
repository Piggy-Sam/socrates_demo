"use client";

import { useState } from "react";
import { Constellation } from "@/components/sky/constellation";
import {
  BreathingStar,
  type StarState,
} from "@/components/sky/breathing-star";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { SAMPLE_SKY } from "@/lib/sample-sky";
import type { SkyStar } from "@/lib/constellation";

const SWATCHES: { name: string; var: string; note: string }[] = [
  { name: "ink", var: "--ink", note: "ground" },
  { name: "raised", var: "--raised", note: "surface" },
  { name: "hairline", var: "--hairline", note: "borders" },
  { name: "marble", var: "--marble", note: "text" },
  { name: "marble-dim", var: "--marble-dim", note: "muted" },
  { name: "gold", var: "--gold", note: "the soul" },
  { name: "gold-lit", var: "--gold-lit", note: "highlight" },
  { name: "cyan", var: "--cyan", note: "the machine" },
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
      <h2 className="mb-8 font-display text-3xl font-light tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignLab() {
  const [starState, setStarState] = useState<StarState>("idle");
  const [selected, setSelected] = useState<SkyStar | null>(null);

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Wordmark size="sm" />
        <div className="flex items-center gap-3">
          <span className="label-mono hidden sm:inline">Design system</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="py-8">
        <p className="label-mono mb-3">The philosopher&apos;s instrument</p>
        <h1 className="max-w-2xl font-display text-4xl font-light leading-tight tracking-tight text-balance sm:text-5xl">
          The examined life, met by a precise instrument.
        </h1>
      </div>

      {/* PALETTE */}
      <Section label="01 · Palette" title="Aegean night, antique gold">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map((s) => (
            <div
              key={s.var}
              className="overflow-hidden rounded-md border border-hairline"
            >
              <div
                className="h-20 w-full"
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
        <p className="mt-4 font-serif text-sm text-marble-dim">
          Warm gold is the human / soul layer, rationed to one focal element.
          Cool cyan is the technical / system layer, living in the mono readouts.
        </p>
      </Section>

      {/* TYPE */}
      <Section label="02 · Typography" title="Four voices, one mind">
        <div className="space-y-8">
          <Specimen role="Display · Fraunces" cls="font-display">
            <p className="text-5xl font-light tracking-tight">
              The unexamined life
            </p>
            <p className="text-3xl font-normal italic text-gold">
              is not worth living.
            </p>
          </Specimen>
          <Specimen role="Body serif · Spectral" cls="font-serif">
            <p className="max-w-2xl text-lg leading-relaxed">
              The person&apos;s own half-formed thought is more interesting and
              more important than anything Socrates could say. The bank reads
              like a commonplace book, not a feed.
            </p>
          </Specimen>
          <Specimen role="UI sans · Geist" cls="font-sans">
            <p className="text-base">
              Chrome, buttons, navigation, and forms — clean and modern, the
              techy register that frames the reverent serif.
            </p>
          </Specimen>
          <Specimen role="Mono · Geist Mono" cls="font-mono">
            <p className="text-sm tracking-wide text-cyan">
              IDEA · 2026-06-22 · 03:14 · SESSION 0xA17 · RECURRENCE ×3
            </p>
          </Specimen>
        </div>
      </Section>

      {/* THE BREATHING STAR */}
      <Section label="03 · Presence" title="The breathing star">
        <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="max-w-md font-serif text-marble-dim">
              Socrates&apos; presence is a single warm-gold breathing star —
              never a VU meter. Distinct, calm states for listening, speaking,
              and thinking.
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
          <div className="flex justify-center rounded-lg border border-hairline bg-ink/60 p-10">
            <BreathingStar state={starState} size={180} />
          </div>
        </div>
      </Section>

      {/* THE CONSTELLATION */}
      <Section label="04 · Signature" title="The constellation of your mind">
        <p className="mb-5 max-w-xl font-serif text-marble-dim">
          Each entry is a star; recurring themes draw the constellations between
          them; the sky grows over time. Hover a star to read it.
        </p>
        <Constellation
          stars={SAMPLE_SKY}
          selectedId={selected?.id ?? null}
          onSelect={(s) => setSelected(s)}
        />
        {selected && (
          <div className="mt-4 rounded-md border border-hairline bg-raised p-4">
            <p className="label-mono">{selected.type}</p>
            <p className="mt-1 font-serif text-marble">{selected.content}</p>
          </div>
        )}
      </Section>

      {/* CONTROLS */}
      <Section label="05 · Controls" title="Buttons & state">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="gold">Call me now</Button>
          <Button variant="outline">Talk anytime</Button>
          <Button variant="ghost">Skip today</Button>
          <Button variant="gold" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <footer className="border-t border-hairline pt-8">
        <span className="label-mono text-marble-dim">
          Socrates AI · the philosopher&apos;s instrument
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
    <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:gap-6">
      <p className="label-mono pt-1">{role}</p>
      <div className={cls}>{children}</div>
    </div>
  );
}
