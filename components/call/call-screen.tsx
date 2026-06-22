"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ConversationProvider } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { BreathingStar } from "@/components/sky/breathing-star";
import { useSocratesCall, type CallPhase } from "./use-socrates-call";

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
    lastMessage,
    error,
    start,
    end,
    toggleMute,
  } = useSocratesCall();

  // Clean teardown: if the user navigates away mid-call, hang up.
  useEffect(() => {
    return () => {
      if (phase === "live" || phase === "connecting") {
        void end();
      }
    };
    // We intentionally only react to phase transitions into an active call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const isActive = phase === "live" || phase === "connecting";
  const firstName = displayName.trim().split(/\s+/)[0] || "friend";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-ink px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
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
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10">
        <div className="grid place-items-center">
          <BreathingStar state={starState} size={220} />
        </div>

        {/* status line — the single source of truth for what's happening */}
        <StatusLine phase={phase} starState={starState} firstName={firstName} />
      </main>

      {/* live captions — minimal, the latest turn only, in Geist */}
      <section className="relative z-10 flex min-h-[3.5rem] w-full max-w-md items-end justify-center px-2">
        <AnimatePresence mode="wait">
          {isActive && lastMessage ? (
            <motion.p
              key={`${lastMessage.role}-${lastMessage.text}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className={`text-pretty text-center font-sans text-lg leading-snug ${
                lastMessage.role === "socrates"
                  ? "text-marble"
                  : "text-marble-dim"
              }`}
            >
              {lastMessage.text}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>

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
      className="flex h-14 w-full max-w-xs items-center justify-center rounded-md bg-accent px-8 font-sans text-base font-medium text-white transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-accent-strong active:translate-y-px disabled:opacity-60 disabled:pointer-events-none"
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
