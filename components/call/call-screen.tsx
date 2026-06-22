"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ConversationProvider } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { BreathingStar } from "@/components/sky/breathing-star";
import { useSocratesCall, type CallPhase } from "./use-socrates-call";

type Props = { displayName: string };

/**
 * The on-demand call surface. MOBILE-FIRST (full-bleed Aegean-night field, the
 * breathing star large and centered as Socrates' presence, big thumb-reachable
 * controls), scaling up gracefully to desktop. Gold is rationed: it is the star
 * and the single "Talk to Socrates" action — nothing else.
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
    <div className="grain relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-ink px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      {/* ambient field — a faint vertical gradient deepens the night */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 38%, rgb(var(--star-glow) / 0.06) 0%, transparent 60%)",
        }}
      />

      {/* top: a quiet mono readout — who's present, no chrome */}
      <header className="relative z-10 flex w-full max-w-md flex-col items-center pt-4 text-center">
        <span className="label-mono">on-demand · voice</span>
      </header>

      {/* center: Socrates' presence */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10">
        <StarHalo>
          <BreathingStar state={starState} size={220} />
        </StarHalo>

        {/* status line — the single source of truth for what's happening */}
        <StatusLine phase={phase} starState={starState} firstName={firstName} />
      </main>

      {/* live captions — minimal, the latest turn only, in serif */}
      <section className="relative z-10 flex min-h-[3.5rem] w-full max-w-md items-end justify-center px-2">
        <AnimatePresence mode="wait">
          {isActive && lastMessage ? (
            <motion.p
              key={`${lastMessage.role}-${lastMessage.text}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className={`text-pretty text-center font-serif text-lg leading-snug ${
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

/** Wraps the star so the glow can bleed without clipping. */
function StarHalo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid place-items-center">
      <div className="absolute -z-10 h-[420px] w-[420px] rounded-full" />
      {children}
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
        <p className="text-pretty font-serif text-xl text-marble-dim">
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
      className="flex h-14 w-full max-w-xs items-center justify-center rounded-md bg-gold px-8 font-sans text-base font-medium text-ink shadow-[0_0_32px_-6px_rgb(var(--star-glow)/0.7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-gold-lit active:translate-y-px disabled:opacity-60 disabled:pointer-events-none"
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
      ? "border-hairline-strong text-marble hover:border-gold hover:text-gold"
      : active
        ? "border-gold/60 bg-raised-2 text-gold"
        : "border-hairline-strong text-marble hover:border-hairline-strong hover:text-marble hover:bg-raised";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={variant === "default" ? active : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-16 place-items-center rounded-full border bg-raised/60 backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ${tone}`}
    >
      {children}
    </button>
  );
}
