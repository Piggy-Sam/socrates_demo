"use client";

import { useState } from "react";
import { ArrowRight, Phone, ChevronDown } from "lucide-react";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { BreathingStar, type StarState } from "@/components/sky/breathing-star";
import { Constellation } from "@/components/sky/constellation";
import type { SkyStar } from "@/lib/constellation";
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

/** A supporting line, muted, beneath the display line. */
function Support({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-7 max-w-2xl text-base leading-relaxed text-pretty text-marble-dim sm:text-lg">
      {children}
    </p>
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

/** The framed chrome a surface mock sits in — a hairline "screen" with a label. */
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

/** /today — greeting + "Today, distilled" + a "Worth returning to" pattern. */
function TodayMock() {
  return (
    <SurfaceFrame label="socrates · /today" className="h-full">
      <div className="flex h-full flex-col gap-5 overflow-hidden">
        {/* greeting — the page's one accent: the prompt caret */}
        <div>
          <p className="label-mono mb-2 text-marble-dim">TODAY</p>
          <h3 className="flex items-baseline font-display text-2xl font-light tracking-tight text-marble">
            <span aria-hidden className="mr-2.5 text-accent">
              &rsaquo;
            </span>
            <span>Afternoon, Human.</span>
          </h3>
        </div>

        {/* today, distilled */}
        <div className="border-t border-hairline pt-4">
          <p className="label-mono mb-3 text-marble-dim">
            FIG.01 · Today, distilled
          </p>
          <p className="text-[0.9375rem] leading-relaxed text-pretty text-marble">
            Today the month-long thread finally said its own name. You stopped
            circling and named it:{" "}
            <span className="text-marble-dim">
              AI agency was never about whether the machine can act for you.
              It&rsquo;s whether you still think — or whether you&rsquo;ve handed
              it over and kept the feeling of having thought.
            </span>
          </p>
        </div>

        {/* worth returning to — a pattern handed back as an open question */}
        <div className="border-t border-hairline pt-4">
          <p className="label-mono mb-3 text-marble-dim">Worth returning to</p>
          <p className="text-[0.9375rem] leading-relaxed text-pretty text-marble">
            The open question stands on its own: when does a tool stop sharpening
            your thinking and start replacing it — and how would you know from
            the inside?
          </p>
          <span className="label-mono mt-2.5 inline-flex items-center gap-1.5 text-marble-dim">
            Press on this
            <ArrowRight className="size-3.5" strokeWidth={1.6} aria-hidden />
          </span>
        </div>
      </div>
    </SurfaceFrame>
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

/** /bank — the signature dot-field of thoughts (REUSES the real Constellation). */
function BankMock() {
  return (
    <SurfaceFrame label="socrates · /bank" className="h-full">
      <div className="flex h-full flex-col gap-3 overflow-hidden">
        <p className="text-[0.9375rem] leading-relaxed text-pretty text-marble">
          Every thought you work out, plotted in your own words — not the
          model&rsquo;s answers.
        </p>
        {/* the living field — non-essential decoration; the count + sample below
            carry the meaning when the canvas doesn't paint. ambient (no hover). */}
        <div className="relative min-h-0 flex-1">
          <Constellation
            stars={BANK_STARS}
            interactive={false}
            framed={false}
            igniteDuration={1.6}
            className="absolute inset-0"
          />
        </div>
        <p className="label-mono text-marble-dim">
          142 THOUGHTS · IDEAS · QUESTIONS · DECISIONS · TENSIONS
        </p>
      </div>
    </SurfaceFrame>
  );
}

/** /recap — the weekly letter excerpt, in Socrates' reflective voice. */
function RecapMock() {
  return (
    <SurfaceFrame label="socrates · /recap" className="h-full">
      <div className="flex h-full flex-col overflow-hidden">
        <p className="label-mono mb-3 text-marble-dim">
          FIG.01 — June 18 – June 24
        </p>
        <article className="space-y-3 border-l border-hairline pl-5 text-[0.9375rem] leading-relaxed text-pretty text-marble">
          <p>
            For a month you&rsquo;ve been circling the same fear without naming
            it, and this week it finally held still long enough for you to say
            it. AI agency, you decided, was never about whether the machine can
            act for you. It&rsquo;s a smaller, harder question:{" "}
            <em className="italic">
              do you still think — or have you handed it over and kept the
              feeling of having thought?
            </em>
          </p>
          <p className="text-marble-dim">
            I won&rsquo;t tell you whether you can build a thing that&rsquo;s
            willing to be less satisfying than the tool that just answers.
            That&rsquo;s the open question, and it&rsquo;s yours to live, not
            mine to close. A midwife, not an oracle.
          </p>
        </article>
      </div>
    </SurfaceFrame>
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
// SLIDE 2 — ORIGIN
// ─────────────────────────────────────────────────────────────────────────────
function SlideOrigin() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.01 · WHERE THIS STARTED</Fig>
      <Display>
        I watched sharp students defend theses they never actually thought.
      </Display>
      <Support>
        Judging a case competition — AI-written numbers and arguments, defended
        on reflex. They didn&rsquo;t care to mean what they said.
      </Support>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — PROBLEM
// ─────────────────────────────────────────────────────────────────────────────
function SlideProblem() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.02 · THE PROBLEM · THEME A.3</Fig>
      <Display>
        Agency isn&rsquo;t an override button. It&rsquo;s whether you still
        think.
      </Display>
      <Support>
        You can&rsquo;t understand, override, or shape what you&rsquo;ve stopped
        thinking about.
      </Support>

      {/* small visual: three faded faculties collapse into one accent THINK */}
      <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="font-display text-sm tracking-wide text-marble-dim/70">
          understand
        </span>
        <span className="text-marble-dim/40">·</span>
        <span className="font-display text-sm tracking-wide text-marble-dim/70">
          override
        </span>
        <span className="text-marble-dim/40">·</span>
        <span className="font-display text-sm tracking-wide text-marble-dim/70">
          shape
        </span>
        <ArrowRight
          className="mx-2 size-4 text-marble-dim"
          strokeWidth={1.6}
          aria-hidden
        />
        <span className="font-display text-base font-medium tracking-[0.18em] text-accent uppercase">
          think
        </span>
      </div>

      <p className="label-mono mt-12 border-t border-hairline pt-6 text-marble-dim">
        EVIDENCE: BRAINONLLM.COM — COGNITIVE OFFLOADING IS MEASURABLE.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — REFRAME
// ─────────────────────────────────────────────────────────────────────────────
function SlideReframe() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.03 · THE REFRAME</Fig>
      <Display>
        So don&rsquo;t build another oracle.{" "}
        <span className="text-accent">Build a midwife.</span>
      </Display>
      <Support>
        Restore agency upstream — by making people think more, not less.
      </Support>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — WHAT IT IS (+ a small surface peek: /today)
// ─────────────────────────────────────────────────────────────────────────────
const TENETS = [
  "Asks before it answers",
  "Never flatters",
  "Keeps YOUR thinking",
  "Resurfaces your patterns",
  "No metrics",
];

function SlideWhatItIs() {
  return (
    <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <Fig>FIG.04 · WHAT SOCRATES AI IS</Fig>
        <Display>A thinking partner that refuses to think for you.</Display>

        <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-2">
          {TENETS.map((t, i) => (
            <div key={t} className="flex flex-col gap-2 bg-ink px-5 py-4">
              <span className="label-mono text-marble-dim/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[0.9375rem] leading-snug text-marble">
                {t}
              </span>
            </div>
          ))}
        </div>

        <p className="label-mono mt-6 text-marble-dim">&rsaquo; VOICE + TEXT</p>
      </div>

      {/* a small, faithful peek at the real product surface */}
      <div className="hidden h-[26rem] lg:block">
        <TodayMock />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — DEMO · THE RECORD — TodayMock + BankMock (constellation) + recap
// ─────────────────────────────────────────────────────────────────────────────
function SlideRecord() {
  return (
    <div className="w-full max-w-6xl">
      <Fig>FIG.05 · YOUR COGNITION, KEPT</Fig>
      <Display className="max-w-3xl">
        Everything you work out becomes yours to return to.
      </Display>

      <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[20rem]">
          <BankMock />
        </div>
        <div className="h-[20rem]">
          <RecapMock />
        </div>
        <div className="h-[20rem]">
          <CallMock />
        </div>
      </div>

      <p className="label-mono mt-6 text-marble-dim">
        &rsaquo; THE BANK · THE WEEKLY RECAP · EVERY CALL, KEPT
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — DEMO · THE DIALOGUE (static styled transcript + the voice orb)
// ─────────────────────────────────────────────────────────────────────────────
function Bubble({
  who,
  children,
}: {
  who: "you" | "socrates";
  children: React.ReactNode;
}) {
  const mine = who === "you";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <p className="label-mono mb-1.5 text-marble-dim">
        {mine ? "YOU" : "SOCRATES"}
      </p>
      <div
        className={`max-w-[34rem] rounded-md px-4 py-3 text-[0.9375rem] leading-relaxed text-pretty ${
          mine
            ? "border border-hairline-strong bg-raised/50 text-marble"
            : "border border-accent/40 bg-accent/[0.06] text-marble"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function SlideDialogue({ active }: SlideProps) {
  return (
    <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
      {/* the voice orb — Socrates' presence; non-essential decoration. The
          meaning lives entirely in the transcript on the right. */}
      <div className="flex flex-col items-center gap-5 text-center">
        <BreathingStar state={active ? "speaking" : "idle"} size={150} />
        <p className="label-mono text-marble-dim">&rsaquo; VOICE · SAME SOCRATES</p>
      </div>

      <div>
        <Fig>FIG.06 · IT PRESSES, IT DOESN&rsquo;T RESOLVE</Fig>

        <div className="flex flex-col gap-4">
          <Bubble who="you">
            I should just generate the reflection essay like everyone else. The
            grade&rsquo;s the same either way.
          </Bubble>
          <Bubble who="socrates">
            So what exactly did they skip that you wish they hadn&rsquo;t?
          </Bubble>
          <Bubble who="you">
            The part where you find out what you actually think by writing it.
            The output looks fine. That&rsquo;s what scares me.
          </Bubble>
          <Bubble who="socrates">
            Hold onto that line — &ldquo;there&rsquo;s no error message when you
            stop thinking.&rdquo; Is something lost, or are you just nostalgic
            for your own way of doing it?
          </Bubble>
        </div>
      </div>
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
