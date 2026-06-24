"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BustMark } from "@/components/brand/bust-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { BreathingStar, type StarState } from "@/components/sky/breathing-star";
import { Button, LinkButton } from "@/components/ui/button";
import { startDemoTalk } from "@/app/pitch/actions";

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
// SLIDE 5 — WHAT IT IS
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
    <div className="max-w-5xl">
      <Fig>FIG.04 · WHAT SOCRATES AI IS</Fig>
      <Display>A thinking partner that refuses to think for you.</Display>

      <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-5">
        {TENETS.map((t, i) => (
          <div
            key={t}
            className="flex flex-col gap-3 bg-ink px-5 py-6"
          >
            <span className="label-mono text-marble-dim/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.9375rem] leading-snug text-marble">
              {t}
            </span>
          </div>
        ))}
      </div>

      <p className="label-mono mt-8 text-marble-dim">&rsaquo; VOICE + TEXT</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — DEMO · THE RECORD (static, on-brand mock cards)
// ─────────────────────────────────────────────────────────────────────────────

/** A hairline card with a FIG caption — the deck's mock-UI building block. */
function MockCard({
  fig,
  className = "",
  children,
}: {
  fig: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-sm border border-hairline bg-raised/40 p-5 ${className}`}
    >
      <p className="label-mono mb-3 text-marble-dim">{fig}</p>
      {children}
    </div>
  );
}

/** A few non-interactive dots — a miniature "bank field" (no connecting lines). */
function MiniField() {
  // a small, deterministic scatter so it reads identically in a static PDF
  const dots = [
    [14, 22, 3],
    [38, 12, 2],
    [62, 30, 4],
    [82, 18, 2.5],
    [26, 48, 2.5],
    [54, 58, 3.5],
    [78, 50, 2],
    [40, 78, 3],
    [66, 82, 2.5],
    [18, 70, 2],
    [90, 70, 3],
    [8, 44, 2],
  ] as const;
  return (
    <svg viewBox="0 0 100 100" className="mt-1 h-24 w-full" aria-hidden>
      {dots.map(([cx, cy, r], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="rgb(var(--accent-rgb))"
          opacity={0.35 + (i % 4) * 0.16}
        />
      ))}
    </svg>
  );
}

function SlideRecord() {
  return (
    <div className="max-w-5xl">
      <Fig>FIG.05 · YOUR COGNITION, KEPT</Fig>
      <Display className="max-w-3xl">
        Everything you work out becomes yours to return to.
      </Display>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MockCard fig="TODAY, DISTILLED">
          <p className="text-sm leading-relaxed text-pretty text-marble">
            You kept circling the same fear about the move — not the city, the
            permanence. The question you landed on:{" "}
            <span className="text-marble-dim">
              what would make it reversible enough to risk?
            </span>
          </p>
        </MockCard>

        <MockCard fig="THE BANK">
          <MiniField />
          <p className="mt-2 text-xs leading-relaxed text-marble-dim">
            142 thoughts, in your words — not the model&rsquo;s answers.
          </p>
        </MockCard>

        <MockCard fig="PATTERN">
          <p className="text-sm leading-relaxed text-pretty text-marble">
            You frame most decisions as doors that lock behind you. Is that the
            shape of the choices — or of how you weigh them?
          </p>
        </MockCard>

        <MockCard fig="RECAP">
          <p className="text-sm leading-relaxed text-pretty text-marble">
            This week your thinking moved from{" "}
            <span className="text-marble-dim">&ldquo;is it safe&rdquo;</span> to{" "}
            <span className="text-marble">&ldquo;is it mine to choose.&rdquo;</span>
          </p>
        </MockCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — DEMO · THE DIALOGUE (static styled transcript)
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
        className={`max-w-[36rem] rounded-md px-4 py-3 text-[0.9375rem] leading-relaxed text-pretty ${
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

function SlideDialogue() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.06 · IT PRESSES, IT DOESN&rsquo;T RESOLVE</Fig>

      <div className="flex flex-col gap-5">
        <Bubble who="you">
          I think I should just quit and go all-in on the startup.
        </Bubble>
        <Bubble who="socrates">
          &ldquo;Just&rdquo; is doing a lot of work there. What would have to be
          true for staying to be the braver choice?
        </Bubble>
        <Bubble who="you">
          Staying feels like giving up. Going feels like believing in myself.
        </Bubble>
        <Bubble who="socrates">
          You&rsquo;ve tied the decision to what it says about you, not to what
          it does. If no one would ever know which you chose — what changes?
        </Bubble>
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
// SLIDE 9 — WHO IT'S FOR
// ─────────────────────────────────────────────────────────────────────────────
function SlideAudience() {
  return (
    <div className="max-w-5xl">
      <Fig>FIG.08 · WHO IT&rsquo;S FOR</Fig>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-2">
        <div className="flex flex-col bg-ink px-7 py-8">
          <p className="label-mono mb-4 text-accent/90">PERSONAL</p>
          <p className="text-lg leading-relaxed text-pretty text-marble">
            People who want AI to sharpen them, not hollow them out: a place to
            think ideas through and keep their own cognition.
          </p>
        </div>
        <div className="flex flex-col bg-ink px-7 py-8">
          <p className="label-mono mb-4 text-marble-dim">EDUCATION</p>
          <p className="text-lg leading-relaxed text-pretty text-marble">
            Institutions — schools, boards, parents — that want AI-literacy
            which protects and develops student thinking.
          </p>
        </div>
      </div>

      <p className="mt-8 text-base text-marble-dim">
        The values are <span className="text-marble">the moat.</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — CLOSE · THE BET
// ─────────────────────────────────────────────────────────────────────────────
const READOUT = [
  { label: "LIVE", value: "socrates-demo-chi.vercel.app" },
  { label: "GITHUB", value: "github.com/Piggy-Sam/socrates_demo" },
  {
    label: "BUILT WITH",
    value: "OPENAI · ELEVENLABS · SUPABASE · VERCEL · TWILIO · NEXT.JS",
  },
  { label: "BY", value: "YANCUN ZHU" },
];

function SlideClose() {
  return (
    <div className="max-w-4xl">
      <Fig>FIG.09 · THE BET</Fig>
      <Display>
        A generation that thinks harder because of its tools —{" "}
        <span className="text-accent">not softer.</span>
      </Display>

      <div className="mt-10">
        <LinkButton href="/" variant="outline" size="lg">
          See the demo
          <ArrowRight className="size-4" strokeWidth={1.8} />
        </LinkButton>
      </div>

      {/* readout band */}
      <dl className="mt-14 grid grid-cols-1 gap-x-10 gap-y-3 border-t border-hairline pt-7 sm:grid-cols-2">
        {READOUT.map((r) => (
          <div key={r.label} className="flex flex-wrap items-baseline gap-x-3">
            <dt className="label-mono shrink-0 text-marble-dim">{r.label}</dt>
            <dd className="label-mono text-marble">{r.value}</dd>
          </div>
        ))}
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
