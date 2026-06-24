"use client";

import { useState } from "react";
import { ArrowRight, ArrowUp, Phone, ChevronDown, Grid3x3, List } from "lucide-react";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark, BlinkCursor, StarMark } from "@/components/brand/wordmark";
import { BreathingStar, type StarState } from "@/components/sky/breathing-star";
import { Constellation } from "@/components/sky/constellation";
import { SummaryMarkdown } from "@/components/summary/markdown";
import { TYPE_GLYPH, type EntryType, type SkyStar } from "@/lib/constellation";
import { Button, LinkButton } from "@/components/ui/button";
import { startDemoTalk } from "@/app/pitch/actions";
import {
  OpenAILogo,
  ElevenLabsLogo,
  SupabaseLogo,
  VercelLogo,
  NextjsLogo,
  TwilioLogo,
} from "./logos";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES — the deck's grammar. One rationed accent per slide,
// hairline rules, .label-mono FIG captions, Geist body, generous negative space.
// Every primitive must read perfectly STATICALLY (the PDF / JS-off contingency).
// ─────────────────────────────────────────────────────────────────────────────

type SlideProps = { active: boolean };

/** The FIG.-style mono caption that opens almost every slide. */
function Fig({ children }: { children: React.ReactNode }) {
  return <p className="label-mono mb-7 text-accent/90">{children}</p>;
}

/** The big display line — Plex, light, tight. The thesis-carrying sentence. */
function Display({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-3xl leading-[1.12] font-light tracking-tight text-balance text-marble sm:text-4xl lg:text-5xl ${className}`}
    >
      {children}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT-SURFACE MOCKS — faithful, STATIC reproductions of the real surfaces,
// built with the same tokens/classes and the AUTHENTIC curated demo content (the
// demo user is "Human"). These render the actual product's design across the
// deck. Canvases (Constellation/BreathingStar) are NON-essential decoration: the
// meaning of every mock lives in static DOM text so the printed PDF still reads.
// Content is verbatim from scripts/seed-demo.mjs — no lorem.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An app-like FRAME so a product slide reads as "the real app, on screen" rather
 * than a bullet slide. It echoes the real <AppNav>: the wordmark, the TODAY /
 * BANK / CHAT / … tabs (the active one in the single rationed accent), and a
 * "Talk now" affordance — but it's inert chrome (no links, no router). The
 * surface itself fills the body. Everything here is static DOM so it prints.
 */
const APP_TABS = ["Today", "The bank", "Chat", "Calls", "Recap"] as const;

function AppFrame({
  active,
  children,
}: {
  active: (typeof APP_TABS)[number];
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-hairline-strong bg-ink shadow-[0_24px_80px_-32px_rgba(0,0,0,0.6)]">
      {/* the nav bar — a faithful, inert echo of the real AppNav */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline bg-ink/80 px-5 py-3 backdrop-blur-md">
        <Wordmark size="sm" href={null} staticCursor />
        <span className="label-mono rounded-sm border border-accent/40 px-1.5 py-0.5 leading-none text-accent">
          Demo
        </span>
        <nav className="flex items-center gap-0.5">
          {APP_TABS.map((t) => (
            <span
              key={t}
              aria-current={t === active ? "page" : undefined}
              className={`label-mono inline-flex items-center rounded-sm px-2.5 py-1.5 ${
                t === active ? "text-accent" : "text-marble-dim"
              }`}
            >
              {t}
            </span>
          ))}
        </nav>
        <span className="ml-auto inline-flex items-center rounded-sm border border-hairline-strong px-3 py-1.5 label-mono text-marble-dim">
          Talk now
        </span>
      </div>
      {/* the surface body */}
      <div className="min-h-0 flex-1 overflow-hidden px-7 py-6 sm:px-10 sm:py-7">
        {children}
      </div>
    </div>
  );
}

/**
 * /today — a faithful, large reproduction of the real Today page: the weekday
 * kicker, the "› Afternoon, Human." greeting with the blinking caret, the
 * "FIG.01 · Today, distilled" block rendered through the REAL <SummaryMarkdown>
 * on the REAL seeded daily summary, and the "Worth returning to" pattern handed
 * back as an open question. Word for word from scripts/seed-demo.mjs. All static
 * DOM — it prints.
 */
// The daysAgo:0 daily summary — verbatim from seed-demo.mjs DAILY[0].
const TODAY_DISTILLED = `Today the month-long thread finally said its own name. Watching a classmate defend an essay he could argue for but not reason through, you stopped circling and named it: AI agency was never about whether the machine can act for you. It's whether you still think — or whether you've handed it over and kept the feeling of having thought.

You turned the line on your own product, which is the only honest place to point it: every feature is a fork — does it make someone stronger without you, or weaker without you? You decided it never hands you the conclusion, even when handing it over would feel kinder.`;

// The flagship pattern's open question — verbatim tail of PATTERNS[0].summary.
const TODAY_PATTERN =
  "When does a tool stop sharpening your thinking and start replacing it — and how would you know from the inside?";

function TodaySurface() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden">
      {/* greeting — the page's one accent: the prompt caret + cursor */}
      <div className="shrink-0">
        <p className="label-mono mb-3">FRIDAY, JUNE 26</p>
        <h1 className="flex items-baseline font-display text-3xl font-light leading-tight tracking-tight text-marble sm:text-4xl">
          <span aria-hidden className="mr-3 text-accent">
            &rsaquo;
          </span>
          <span>Afternoon, Human.</span>
          <BlinkCursor noBlink />
        </h1>
      </div>

      {/* today, distilled — the REAL renderer on the REAL summary */}
      <section className="mt-7 border-t border-hairline pt-6">
        <p className="label-mono mb-4">FIG.01 · Today, distilled</p>
        <SummaryMarkdown content={TODAY_DISTILLED} />
      </section>

      {/* worth returning to — a pattern handed back as an open question */}
      <section className="mt-6 border-t border-hairline pt-6">
        <p className="label-mono mb-4">Worth returning to</p>
        <p className="font-sans text-lg leading-relaxed text-marble text-pretty">
          {TODAY_PATTERN}
        </p>
        <span className="label-mono mt-2.5 inline-flex items-center gap-1.5 text-marble-dim">
          Press on this
          <ArrowRight className="size-3.5" strokeWidth={1.6} aria-hidden />
        </span>
      </section>
    </div>
  );
}

// ~16 real banked thoughts — verbatim content + type, so the dot-field is the
// person's actual mind. Stable ids drive deterministic positions; brightness
// (recency/recurrence) drives size. The accompanying static list carries the
// meaning if the <canvas> doesn't paint (print/PDF).
const BANK_STARS: SkyStar[] = [
  { id: "b-agency-decision", type: "decision", brightness: 1, themes: ["ai & agency"], content: "AI agency was never about whether the machine can act for you. It's whether you still think — or whether you've quietly handed it over and kept the feeling of having thought." },
  { id: "b-classmate", type: "observation", brightness: 0.92, themes: ["ai & agency"], content: "Watched a classmate defend an essay he didn't write — certain without the work that earns certainty." },
  { id: "b-friction", type: "idea", brightness: 0.88, themes: ["ai & agency"], content: "The model hands you the most confident version of whatever you already leaned toward. The friction WAS the signal." },
  { id: "b-fork", type: "decision", brightness: 0.85, themes: ["the product"], content: "Every feature is a fork: does this make someone stronger without me, or weaker without me?" },
  { id: "b-click", type: "idea", brightness: 0.8, themes: ["ai & agency"], content: "AI can hand you the answer but it can't hand you the click — the click only happens if you carried the confusion yourself." },
  { id: "b-instrument", type: "decision", brightness: 0.78, themes: ["the product"], content: "An instrument, not an oracle. It makes the gap where the click can happen." },
  { id: "b-still-think", type: "question", brightness: 0.74, themes: ["the product"], content: "Does Socrates make people still think — or does it just hand them a better-feeling conclusion?" },
  { id: "b-streak", type: "decision", brightness: 0.66, themes: ["anti-metric"], content: "Never count the days, only the thinking. A streak rewards continuity and punishes the gap." },
  { id: "b-watched", type: "idea", brightness: 0.6, themes: ["anti-metric"], content: "The test for any surface: does it ever make the user feel WATCHED for absence?" },
  { id: "b-fear", type: "feeling", brightness: 0.58, themes: ["integrity"], content: "The thing I'm most afraid of in other people is the thing I have the most power to do myself." },
  { id: "b-obsolescence", type: "idea", brightness: 0.54, themes: ["the product"], content: "If it's working you need it LESS over time, not more. Built for its own obsolescence." },
  { id: "b-grade", type: "opinion", brightness: 0.5, themes: ["education"], content: "The grade isn't the disease. The grade is the symptom." },
  { id: "b-replication", type: "opinion", brightness: 0.46, themes: ["science"], content: "The replication crisis isn't proof the method failed — it's the method CATCHING the rot." },
  { id: "b-reading", type: "decision", brightness: 0.42, themes: ["attention"], content: "I'm going to protect some reading I'm not allowed to use for anything. Useless on purpose." },
  { id: "b-dad", type: "feeling", brightness: 0.38, themes: ["family"], content: "Found one of my dad's old notes in a book today. 'Eat breakfast.'" },
  { id: "b-walk", type: "observation", brightness: 0.34, themes: ["rest"], content: "I think more clearly walking than sitting. My best ideas arrive the moment I stop trying to have them." },
  { id: "b-bar", type: "decision", brightness: 0.3, themes: ["direction"], content: "My bar: one real person, who isn't my mum, uses it and it changes how they think. One mind that moved." },
];

/**
 * /bank — a faithful, large reproduction of the real Bank page: the page header
 * ("The field of your thinking" / "The bank"), the field/list toggle, and the
 * signature dot-FIELD plotted by the REAL <Constellation> over the REAL seeded
 * thoughts. PRINT CONTINGENCY: the <canvas>-free constellation is SVG-ish DOM
 * dots, but to be safe the meaning also lives in the header + the static list of
 * a few real thoughts below, so the printed PDF reads even if dots don't paint.
 */
function BankSurface() {
  // a few of the brightest real thoughts, as a static legend the print path can
  // always read (the field above is the living version).
  const legend = BANK_STARS.slice(0, 4);
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden">
      <header className="shrink-0">
        <p className="label-mono mb-3">
          <span className="text-accent">&rsaquo;</span> The field of your thinking
        </p>
        <h1 className="font-display text-3xl font-light tracking-tight text-marble sm:text-4xl">
          The bank
        </h1>
      </header>

      {/* the field/list toggle + the quiet "the field" readout (verbatim) */}
      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
        <div className="inline-flex rounded-md border border-hairline p-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-raised-2 px-3 py-1.5 font-mono-display text-xs uppercase tracking-[0.12em] text-accent-strong">
            <Grid3x3 className="size-3.5" strokeWidth={1.6} aria-hidden />
            field
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono-display text-xs uppercase tracking-[0.12em] text-marble-dim">
            <List className="size-3.5" strokeWidth={1.6} aria-hidden />
            list
          </span>
        </div>
        <span className="label-mono text-marble-dim">the field</span>
      </div>

      {/* the living field — the REAL Constellation; ambient (no hover). */}
      <div className="relative mt-6 min-h-0 flex-1 overflow-hidden rounded-md border border-hairline bg-raised">
        <Constellation
          stars={BANK_STARS}
          interactive={false}
          framed={false}
          igniteDuration={1.6}
          className="absolute inset-0"
        />
      </div>

      {/* the real "select one to read it" hint (verbatim) + a tiny static legend
          carrying meaning for the print path */}
      <p className="mt-4 shrink-0 font-sans text-sm text-marble-dim">
        Each dot is a thought; the ones you keep returning to plot brighter and
        larger. Select one to read it.
      </p>
      <ul className="mt-3 hidden shrink-0 gap-x-6 gap-y-1 sm:grid sm:grid-cols-2 print:grid">
        {legend.map((s) => (
          <li
            key={s.id}
            className="label-mono flex items-baseline gap-1.5 truncate text-marble-dim"
          >
            <span aria-hidden className="text-accent">
              {TYPE_GLYPH[s.type as EntryType]}
            </span>
            <span className="truncate">{s.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small "screen" frame for the secondary /calls peek on slide 9 — a hairline
 *  card with a window-dots header and a mono label. (The primary product slides
 *  5/6/7 use the richer <AppFrame> instead.) */
function SurfaceFrame({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-md border border-hairline bg-raised/50 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-marble-dim/30" />
          <span className="size-2 rounded-full bg-marble-dim/30" />
          <span className="size-2 rounded-full bg-marble-dim/30" />
        </span>
        <span className="label-mono ml-1 text-marble-dim">{label}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-5">{children}</div>
    </div>
  );
}

/** /calls — a call card: when/duration, "what surfaced" chips (decision→
 *  question), and a short transcript excerpt. */
function CallMock() {
  return (
    <SurfaceFrame label="socrates · /calls" className="h-full">
      <article className="flex h-full flex-col gap-4 overflow-hidden">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="label-mono flex items-center gap-1.5 text-marble-dim">
              <Phone className="size-3.5" strokeWidth={1.8} aria-hidden />
              Phone call
            </p>
            <p className="mt-1.5 text-[0.9375rem] text-marble">
              Tue, Jun 24 · 9:14 PM
            </p>
          </div>
          <p className="label-mono text-marble-dim">16m</p>
        </header>

        {/* what surfaced — decision first, then question (the real ordering) */}
        <div className="border-t border-hairline pt-4">
          <p className="label-mono mb-3 text-marble-dim">&rsaquo; what surfaced</p>
          <ul className="space-y-3">
            <li>
              <p className="label-mono mb-1 text-marble-dim">Decision</p>
              <p className="text-[0.875rem] leading-relaxed text-pretty text-marble">
                It never hands you the conclusion. It makes you take the last
                step yourself, even when handing it over would feel kinder.
              </p>
            </li>
            <li>
              <p className="label-mono mb-1 text-marble-dim">Question</p>
              <p className="text-[0.875rem] leading-relaxed text-pretty text-marble">
                Does Socrates make people still think — or does it just hand them
                a better-feeling conclusion?
              </p>
            </li>
          </ul>
        </div>

        {/* a short transcript excerpt */}
        <div className="mt-auto border-t border-hairline pt-3">
          <p className="label-mono mb-2.5 flex items-center gap-1.5 text-marble-dim">
            <ChevronDown className="size-3.5" strokeWidth={1.8} aria-hidden />
            Transcript
          </p>
          <div className="space-y-2.5">
            <div>
              <p className="label-mono mb-0.5 text-accent">Socrates</p>
              <p className="text-[0.875rem] leading-relaxed text-pretty text-marble">
                What bugged you — that they used the tool, or that the sharp ones
                did?
              </p>
            </div>
            <div>
              <p className="label-mono mb-0.5 text-marble-dim">You</p>
              <p className="text-[0.875rem] leading-relaxed text-pretty text-marble">
                The output looks fine. That&rsquo;s what scares me. There&rsquo;s
                no error message when you stop thinking.
              </p>
            </div>
          </div>
        </div>
      </article>
    </SurfaceFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — TITLE
// ─────────────────────────────────────────────────────────────────────────────
function SlideTitle() {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="label-mono mb-10 text-accent/90">
        &rsaquo; AN INSTRUMENT FOR THE EXAMINED LIFE
      </p>

      <BustMark size={132} className="mb-9 text-marble" title="Socrates AI" />

      <Wordmark href={null} size="xl" withStar={false} staticCursor />

      <p className="mt-8 max-w-xl text-lg leading-relaxed text-pretty text-marble sm:text-xl">
        AI that sharpens your thinking instead of replacing it.
      </p>

      <p className="label-mono mt-16 text-marble-dim">
        YANCUN ZHU · THEME A.3 · HUMAN AGENCY IN AI-MEDIATED DECISIONS
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — ORIGIN — word-light; the case-competition story is SPOKEN.
// ─────────────────────────────────────────────────────────────────────────────
function SlideOrigin() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.01</Fig>
      <Display>
        Sharp students defended theses{" "}
        <span className="text-accent">they never thought through.</span>
      </Display>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — PROBLEM · A.3 — word-light; the framing is SPOKEN.
// ─────────────────────────────────────────────────────────────────────────────
function SlideProblem() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.02 · THEME A.3</Fig>
      <Display>
        Agency isn&rsquo;t an override button.{" "}
        <span className="text-accent">It&rsquo;s whether you still think.</span>
      </Display>
      <p className="label-mono mt-12 border-t border-hairline pt-6 text-marble-dim">
        BRAINONLLM.COM — COGNITIVE OFFLOADING IS MEASURABLE
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — STANCE — word-light; a midwife, with a tight inline list.
// ─────────────────────────────────────────────────────────────────────────────
const STANCE = [
  "Asks before it answers",
  "Presses",
  "Never flatters",
  "Keeps the record",
];

function SlideReframe() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.03</Fig>
      <Display>
        Not an oracle.{" "}
        <span className="text-accent">A midwife for your thinking.</span>
      </Display>
      <ul className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-3">
        {STANCE.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            {i > 0 ? (
              <span aria-hidden className="text-marble-dim/40">
                &middot;
              </span>
            ) : null}
            <span className="label-mono text-marble">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — TODAY (product) — a faithful, LARGE /today inside an app frame.
// Almost wordless: the greeting, the real "Today, distilled" markdown, and the
// "Worth returning to" pattern do all the talking. The narration is spoken.
// ─────────────────────────────────────────────────────────────────────────────
function SlideWhatItIs() {
  return (
    <div className="h-[78vh] max-h-[44rem] w-full max-w-6xl">
      <AppFrame active="Today">
        <TodaySurface />
      </AppFrame>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — BANK (product) — a faithful, LARGE /bank inside an app frame: the
// signature dot-field (the REAL <Constellation> over the REAL thoughts) is the
// shape of your own mind over time. Word-light; the narration is spoken.
// ─────────────────────────────────────────────────────────────────────────────
function SlideRecord() {
  return (
    <div className="h-[78vh] max-h-[44rem] w-full max-w-6xl">
      <AppFrame active="The bank">
        <BankSurface />
      </AppFrame>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — CHAT (product) — a faithful, LARGE /chat exchange inside an app
// frame, in the REAL bubble grammar: the user's turn is a right-aligned boxed
// bubble; Socrates' turn is left-aligned PLAIN text under a StarMark + "Socrates"
// label (no bubble) — exactly chat-client.tsx. The exchange names the hidden
// assumption and HANDS THE THREAD BACK instead of resolving. Verbatim from the
// seeded s13 thread. All static DOM — it prints.
// ─────────────────────────────────────────────────────────────────────────────
function ChatTurn({
  role,
  children,
}: {
  role: "user" | "socrates";
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex flex-col items-end">
        <p className="label-mono mb-1.5 text-marble-dim">You</p>
        <p className="text-pretty max-w-[85%] whitespace-pre-wrap rounded-md rounded-tr-sm border border-hairline bg-raised px-4 py-2.5 text-left font-sans text-[1.0625rem] leading-relaxed text-marble">
          {children}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start pl-1">
      <p className="label-mono mb-1.5 flex items-center gap-1.5 text-marble-dim">
        <StarMark size={9} />
        Socrates
      </p>
      <p className="text-pretty max-w-[88%] whitespace-pre-wrap font-sans text-[1.0625rem] leading-relaxed text-marble">
        {children}
      </p>
    </div>
  );
}

function ChatSurface() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden">
      {/* the real chat header */}
      <header className="mb-5 shrink-0 border-b border-hairline pb-4">
        <p className="label-mono mb-2">
          <span className="text-accent">&rsaquo;</span> chat
        </p>
        <h1 className="font-display text-xl font-light tracking-tight text-marble sm:text-2xl">
          Think it through in writing.
        </h1>
      </header>

      {/* transcript — it names the hidden assumption and hands the thread back */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-7 overflow-hidden">
        <ChatTurn role="user">
          A calculator made us faster but we can still reason about quantity.
          This feels different — like outsourcing the reasoning itself, not the
          arithmetic.
        </ChatTurn>
        <ChatTurn role="socrates">
          Test that. The calculator outsourced a step you&rsquo;d already
          mastered — you learned long division first, then handed it off. What if
          the order reverses, and someone outsources the reasoning BEFORE they
          ever built it? Is that the same trade, or a different one?
        </ChatTurn>
        <ChatTurn role="user">
          Different. You can&rsquo;t outsource a muscle you never grew.
          Augmentation needs a base to augment.
        </ChatTurn>
        <ChatTurn role="socrates">
          Then you&rsquo;ve found your own dividing line, and it&rsquo;s sharper
          than &ldquo;AI good / AI bad.&rdquo; Which side of your own line does
          Socrates have to stay on?
        </ChatTurn>
      </div>

      {/* the real composer — inert chrome, with the terminal caret */}
      <div className="mt-3 shrink-0 border-t border-hairline pt-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-1 items-start gap-2 rounded-md border border-hairline bg-raised px-3">
            <span
              aria-hidden
              className="select-none pt-3 font-mono-display text-base leading-none text-marble-dim"
            >
              &rsaquo;
            </span>
            <span className="min-h-[2.75rem] flex-1 py-3 font-sans text-base text-marble-dim">
              What&rsquo;s on your mind?
            </span>
          </div>
          <span className="inline-flex aspect-square h-[2.75rem] items-center justify-center rounded-md bg-accent-btn">
            <ArrowUp className="size-5 text-white" strokeWidth={1.8} aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}

function SlideDialogue() {
  return (
    <div className="h-[78vh] max-h-[44rem] w-full max-w-6xl">
      <AppFrame active="Chat">
        <ChatSurface />
      </AppFrame>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — ★ LIVE — the real thing
// ─────────────────────────────────────────────────────────────────────────────
type CallStatus = {
  kind: "idle" | "placing" | "ok" | "error";
  message: string;
};

function SlideLive({ active }: SlideProps) {
  const [status, setStatus] = useState<CallStatus>({ kind: "idle", message: "" });

  // The orb reacts to the call attempt — but the slide is fully legible without
  // ever clicking (the live call is NON-essential). idle → thinking while
  // placing → speaking once the phone is ringing.
  const orbState: StarState =
    status.kind === "placing"
      ? "thinking"
      : status.kind === "ok"
        ? "speaking"
        : "idle";

  async function placeCall() {
    if (status.kind === "placing") return;
    setStatus({ kind: "placing", message: "Placing the call…" });
    try {
      const res = await fetch("/api/calls/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        cooldown?: boolean;
        blocked?: boolean;
        error?: string;
      };
      if (data.ok) {
        setStatus({
          kind: "ok",
          message:
            "Your phone's ringing — Socrates will open with “what's on your mind?”",
        });
      } else {
        setStatus({
          kind: "error",
          message:
            data.error ||
            (data.cooldown
              ? "Give it a moment before the next call."
              : "The call couldn't be placed just now."),
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "The call couldn't be placed just now.",
      });
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Fig>FIG.07 · LIVE — THE REAL THING</Fig>

      <div className="my-2">
        <BreathingStar
          state={active ? orbState : "idle"}
          size={168}
        />
      </div>

      <Display className="mt-2">Let me show you.</Display>

      <div className="mt-10 flex flex-col items-center gap-4">
        <Button size="lg" onClick={placeCall} disabled={status.kind === "placing"}>
          Call my phone
        </Button>

        {/* status line — reserves height so the layout never jumps */}
        <p
          className={`label-mono min-h-[1.25rem] max-w-md normal-case ${
            status.kind === "error" ? "text-danger" : "text-marble-dim"
          }`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>

        {/* in-browser fallback — sets the demo cookie, then /talk */}
        <form action={startDemoTalk}>
          <Button type="submit" variant="ghost" size="md">
            …or talk to it in the browser
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — WHO IT'S FOR (+ a tasteful UI peek: the call card)
// ─────────────────────────────────────────────────────────────────────────────
function SlideAudience() {
  return (
    <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <Fig>FIG.08 · WHO IT&rsquo;S FOR</Fig>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline">
          <div className="flex flex-col bg-ink px-7 py-7">
            <p className="label-mono mb-3 text-accent/90">PERSONAL</p>
            <p className="text-lg leading-relaxed text-pretty text-marble">
              People who want AI to sharpen them, not hollow them out: a place to
              think ideas through and keep their own cognition.
            </p>
          </div>
          <div className="flex flex-col bg-ink px-7 py-7">
            <p className="label-mono mb-3 text-marble-dim">EDUCATION</p>
            <p className="text-lg leading-relaxed text-pretty text-marble">
              Institutions — schools, boards, parents — that want AI-literacy
              which protects and develops student thinking.
            </p>
          </div>
        </div>

        <p className="mt-7 text-base text-marble-dim">
          The values are <span className="text-marble">the moat.</span>
        </p>
      </div>

      {/* a tasteful peek at the call surface — what a conversation leaves behind */}
      <div className="hidden h-[24rem] lg:block">
        <CallMock />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — CLOSE · BUILT WITH — the tools that power Socrates AI, sponsors led
// ─────────────────────────────────────────────────────────────────────────────

/** The two headline sponsors — large logo, name, and the role they play. */
function SponsorCard({
  logo,
  name,
  role,
}: {
  logo: React.ReactNode;
  name: string;
  role: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-hairline bg-raised/40 p-6 sm:p-7">
      <div className="flex items-center gap-4">
        <span className="text-marble">{logo}</span>
        <span className="font-display text-xl font-medium tracking-tight text-marble sm:text-2xl">
          {name}
        </span>
      </div>
      <p className="text-[0.9375rem] leading-relaxed text-pretty text-marble-dim">
        {role}
      </p>
    </div>
  );
}

/** A smaller "also built with" tool — compact logo + one role line. */
function ToolRow({
  logo,
  name,
  role,
}: {
  logo: React.ReactNode;
  name: string;
  role: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-ink px-4 py-4">
      <span className="shrink-0 text-marble-dim">{logo}</span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-sm font-medium tracking-tight text-marble">
          {name}
        </span>
        <span className="text-xs leading-snug text-pretty text-marble-dim">
          {role}
        </span>
      </span>
    </div>
  );
}

const CLOSE_LINKS = [
  { label: "LIVE", value: "socrates-demo-chi.vercel.app" },
  { label: "GITHUB", value: "github.com/Piggy-Sam/socrates_demo" },
];

function SlideClose() {
  return (
    <div className="w-full max-w-6xl">
      <Fig>FIG.09 · BUILT WITH</Fig>
      <Display className="max-w-3xl">
        A generation that thinks harder because of its tools —{" "}
        <span className="text-accent">not softer.</span>
      </Display>

      {/* FEATURED — the two sponsors, with prominent treatment */}
      <p className="label-mono mt-10 mb-4 text-accent/90">
        &rsaquo; POWERED BY OUR SPONSORS
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SponsorCard
          logo={<OpenAILogo className="size-9 sm:size-11" />}
          name="OpenAI"
          role="The Socratic dialogue, distillation, and the embeddings that form the memory."
        />
        <SponsorCard
          logo={<ElevenLabsLogo className="size-9 sm:size-11" />}
          name="ElevenLabs"
          role="The real-time voice agent — Socrates you can talk to, on the phone or in the browser."
        />
      </div>

      {/* ALSO BUILT WITH — the supporting stack, smaller */}
      <p className="label-mono mt-8 mb-4 text-marble-dim">ALSO BUILT WITH</p>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        <ToolRow
          logo={<SupabaseLogo className="size-6" />}
          name="Supabase"
          role="Postgres + pgvector — the memory store."
        />
        <ToolRow
          logo={<VercelLogo className="size-5" />}
          name="Vercel"
          role="Hosting + cron."
        />
        <ToolRow
          logo={<TwilioLogo className="size-6" />}
          name="Twilio"
          role="The phone calls."
        />
        <ToolRow
          logo={<NextjsLogo className="size-6" />}
          name="Next.js"
          role="The app."
        />
      </div>

      {/* links row — live, github, see demo */}
      <dl className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hairline pt-6">
        {CLOSE_LINKS.map((r) => (
          <div key={r.label} className="flex items-baseline gap-x-3">
            <dt className="label-mono shrink-0 text-marble-dim">{r.label}</dt>
            <dd className="label-mono text-marble">{r.value}</dd>
          </div>
        ))}
        <LinkButton href="/" variant="outline" size="md" className="ml-auto">
          See the demo
          <ArrowRight className="size-4" strokeWidth={1.8} />
        </LinkButton>
      </dl>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THE DECK — ten slide components, in order. Each takes { active }.
// ─────────────────────────────────────────────────────────────────────────────
export const SLIDES: ((props: SlideProps) => React.JSX.Element)[] = [
  SlideTitle,
  SlideOrigin,
  SlideProblem,
  SlideReframe,
  SlideWhatItIs,
  SlideRecord,
  SlideDialogue,
  SlideLive,
  SlideAudience,
  SlideClose,
];
