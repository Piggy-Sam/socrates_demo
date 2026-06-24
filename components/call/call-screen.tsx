"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ConversationProvider } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { BreathingStar } from "@/components/sky/breathing-star";
import {
  useSocratesCall,
  type CallPhase,
  type LiveCaption,
} from "./use-socrates-call";

type Props = { displayName: string };

/**
 * The on-demand voice surface. MOBILE-FIRST (full-bleed paper field, the
 * dot-orb large and centered as Socrates' presence, big thumb-reachable
 * controls), scaling up gracefully to desktop. Voice is one instrument among
 * several — kept calm and functional, not a spectacle. The single blue accent
 * is rationed: it is the orb and the one "Talk to Socrates" action — nothing
 * else.
 *
 * useConversation requires a ConversationProvider ancestor, so we mount one here
 * and keep the actual UI/logic in the inner component.
 */
export function CallScreen({ displayName }: Props) {
  return (
    <ConversationProvider>
      <CallSurface displayName={displayName} />
    </ConversationProvider>
  );
}

const STATUS_COPY: Record<string, string> = {
  connecting: "connecting",
  listening: "listening",
  speaking: "Socrates is speaking",
  ended: "the line is quiet",
};

function CallSurface({ displayName }: Props) {
  const reduce = useReducedMotion();
  const {
    phase,
    starState,
    isMuted,
    messages,
    error,
    start,
    end,
    toggleMute,
  } = useSocratesCall();

  // Clean teardown: if the user navigates AWAY mid-call (component unmount),
  // hang up. We read phase + end through refs and use an EMPTY dependency array
  // so this fires ONLY on unmount. Depending on [phase] was a bug: React runs an
  // effect's cleanup on every dependency change, so the connecting->live
  // transition ran the previous cleanup (whose closure still saw phase
  // "connecting") and called end() — tearing the call down the instant it
  // connected (≈2s, no audio).
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => {
    return () => {
      if (phaseRef.current === "live" || phaseRef.current === "connecting") {
        void endRef.current();
      }
    };
  }, []);

  // Orb is smaller on phones so the orb + status + captions + controls all fit
  // one screen; it grows to its full presence at the sm breakpoint and up.
  const orbSize = useOrbSize();

  const isActive = phase === "live" || phase === "connecting";
  const firstName = displayName.trim().split(/\s+/)[0] || "friend";

  return (
    // Height derives from --nav-h (set on the app shell) so the column fits
    // exactly UNDER the sticky nav — the live controls can never slip below the
    // fold. justify-between pins the footer to the bottom; the caption band in
    // the middle is internally clamped so a long turn can't push it off-screen.
    <div className="relative flex min-h-[calc(100dvh-var(--nav-h))] flex-col items-center justify-between overflow-hidden bg-ink px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* ambient field — a faint dot-grid, like graph paper for the instrument */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          backgroundPosition: "center",
        }}
      />

      {/* top: a quiet mono readout — the instrument, in voice */}
      <header className="relative z-10 flex w-full max-w-md flex-col items-center pt-4 text-center">
        <span className="label-mono">&rsaquo; voice &middot; one instrument of many</span>
      </header>

      {/* center: Socrates' presence — the dot-orb */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 sm:gap-10">
        <div className="grid place-items-center">
          <BreathingStar state={starState} size={orbSize} />
        </div>

        {/* status line — the single source of truth for what's happening */}
        <StatusLine phase={phase} starState={starState} firstName={firstName} />
      </main>

      {/* live captions — a short rolling transcript, clamped to a fixed band so
          a long Socrates turn scrolls/fades INTERNALLY and can never displace
          the controls. Each turn reads as an instrument readout: a mono speaker
          label + a left hairline rule. */}
      <Captions active={isActive} messages={messages} reduce={!!reduce} />

      {/* bottom: the controls — full-bleed, thumb-reachable */}
      <footer className="relative z-10 flex w-full max-w-md flex-col items-center gap-4 pb-2">
        {error ? (
          <p
            role="alert"
            className="text-balance text-center font-sans text-sm text-marble-dim"
          >
            {error}
          </p>
        ) : null}

        {isActive ? (
          <LiveControls
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onEnd={end}
            disabled={phase === "connecting"}
          />
        ) : (
          <StartControl phase={phase} onStart={start} />
        )}
      </footer>
    </div>
  );
}

// Picks the orb's pixel size from the viewport: compact on phones, full on the
// sm breakpoint and up. matchMedia keeps it in sync without a resize listener.
function useOrbSize() {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setLarge(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return large ? 220 : 160;
}

// The live caption band. A FIXED-height, internally-clipped region: the footer
// below it stays put no matter how long Socrates talks. A top/bottom gradient
// mask fades the band's edges so older lines dissolve rather than hard-cut.
function Captions({
  active,
  messages,
  reduce,
}: {
  active: boolean;
  messages: LiveCaption[];
  reduce: boolean;
}) {
  const shown = active ? messages : [];

  return (
    <section
      aria-live="polite"
      aria-atomic="false"
      className="relative z-10 flex h-[7.5rem] w-full max-w-md flex-col justify-end overflow-hidden px-2 sm:h-[8.5rem]"
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 1.75rem, black 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent, black 1.75rem, black 100%)",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((m, i) => {
          // Older lines in the buffer dim; the newest turn is fully present.
          const isLatest = i === shown.length - 1;
          const isSocrates = m.role === "socrates";
          return (
            <motion.div
              key={m.id}
              layout
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: isLatest ? 1 : 0.45, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="border-l border-hairline pl-3 pb-2 last:pb-0"
            >
              <span
                className={`label-mono block ${
                  isSocrates ? "text-accent" : "text-marble-dim"
                }`}
              >
                {isSocrates ? "› socrates" : "you"}
              </span>
              <p
                className={`text-pretty font-sans text-base leading-snug ${
                  isSocrates ? "text-marble" : "text-marble-dim"
                }`}
              >
                {m.text}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
}

function StatusLine({
  phase,
  starState,
  firstName,
}: {
  phase: CallPhase;
  starState: string;
  firstName: string;
}) {
  let label: string;
  if (phase === "idle") {
    label = "ready when you are";
  } else if (phase === "error") {
    label = "the line is quiet";
  } else {
    label = STATUS_COPY[starState] ?? STATUS_COPY[phase] ?? "with you";
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="label-mono" aria-live="polite">
        {label}
      </span>
      {phase === "idle" ? (
        <p className="text-pretty font-sans text-xl text-marble-dim">
          What&rsquo;s on your mind, {firstName}?
        </p>
      ) : null}
    </div>
  );
}

function StartControl({
  phase,
  onStart,
}: {
  phase: CallPhase;
  onStart: () => void;
}) {
  const connecting = phase === "connecting";
  const label =
    phase === "ended"
      ? "Talk again"
      : phase === "error"
        ? "Try again"
        : "Talk to Socrates";

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={connecting}
      className="flex h-14 w-full max-w-xs items-center justify-center rounded-md bg-accent-btn px-8 font-sans text-base font-medium text-white transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:opacity-90 active:translate-y-px disabled:opacity-60 disabled:pointer-events-none"
    >
      {connecting ? "connecting…" : label}
    </button>
  );
}

function LiveControls({
  isMuted,
  onToggleMute,
  onEnd,
  disabled,
}: {
  isMuted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-center gap-10">
      <RoundControl
        label={isMuted ? "Unmute microphone" : "Mute microphone"}
        onClick={onToggleMute}
        disabled={disabled}
        active={isMuted}
      >
        {isMuted ? (
          <MicOff strokeWidth={1.6} className="size-6" />
        ) : (
          <Mic strokeWidth={1.6} className="size-6" />
        )}
      </RoundControl>

      <RoundControl label="End the conversation" onClick={onEnd} variant="end">
        <PhoneOff strokeWidth={1.6} className="size-6" />
      </RoundControl>
    </div>
  );
}

function RoundControl({
  label,
  onClick,
  children,
  disabled = false,
  active = false,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "end";
}) {
  const tone =
    variant === "end"
      ? "border-hairline-strong text-marble hover:border-marble hover:bg-raised-2"
      : active
        ? "border-accent bg-accent/10 text-accent"
        : "border-hairline-strong text-marble hover:border-marble hover:bg-raised-2";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={variant === "default" ? active : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-16 place-items-center rounded-full border bg-raised transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ${tone}`}
    >
      {children}
    </button>
  );
}
