"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

export type StarState =
  | "idle"
  | "listening"
  | "speaking"
  | "thinking"
  | "ended";

type Props = {
  state?: StarState;
  /** 0..1 live audio amplitude — used gently, never as a VU meter */
  level?: number;
  /** diameter of the core presence, in px */
  size?: number;
  className?: string;
};

// Per-state character. Calm by design — presence, not metering.
const CORE: Record<
  StarState,
  { scale: number[]; dur: number; bright: number }
> = {
  idle: { scale: [1, 1.06, 1], dur: 5.5, bright: 0.88 },
  listening: { scale: [1, 1.12, 1.02, 1], dur: 4, bright: 1 },
  speaking: { scale: [1, 1.09, 1.04, 1.1, 1], dur: 2.4, bright: 1 },
  thinking: { scale: [1, 1.03, 1], dur: 7, bright: 0.6 },
  ended: { scale: [1], dur: 6, bright: 0.4 },
};

export function BreathingStar({
  state = "idle",
  level = 0,
  size = 160,
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const cfg = CORE[state];
  const amp = Math.max(0, Math.min(1, level));

  const auraScale =
    (state === "speaking" ? 1.15 : state === "listening" ? 1.08 : 1) +
    amp * 0.12;

  const coreTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: cfg.dur, repeat: Infinity, ease: [0.4, 0, 0.6, 1] };

  const ringCount = state === "speaking" ? 3 : state === "listening" ? 1 : 0;

  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Socrates is ${state === "ended" ? "resting" : state}`}
    >
      {/* outer aura — the lamp's glow */}
      <motion.span
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size * 1.9,
          height: size * 1.9,
          background:
            "radial-gradient(circle, rgb(var(--star-glow) / 0.42) 0%, rgb(var(--star-glow) / 0.12) 38%, transparent 70%)",
        }}
        animate={
          reduce
            ? { opacity: cfg.bright * 0.8 }
            : {
                opacity: [
                  cfg.bright * 0.55,
                  cfg.bright * 0.85,
                  cfg.bright * 0.55,
                ],
                scale: [auraScale * 0.96, auraScale, auraScale * 0.96],
              }
        }
        transition={coreTransition}
      />

      {/* emanating rings — energy out (speaking) / receptive halo (listening) */}
      {!reduce &&
        Array.from({ length: ringCount }).map((_, i) => (
          <motion.span
            key={`${state}-ring-${i}`}
            aria-hidden
            className="absolute rounded-full border"
            style={{
              width: size * 0.7,
              height: size * 0.7,
              borderColor: "rgb(var(--star-glow) / 0.5)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 2.4, opacity: [0, 0.4, 0] }}
            transition={{
              duration: state === "speaking" ? 2.6 : 4.5,
              repeat: Infinity,
              delay: i * (state === "speaking" ? 0.85 : 0),
              ease: "easeOut",
            }}
          />
        ))}

      {/* the core star */}
      <motion.span
        aria-hidden
        className="relative block rounded-full"
        style={{
          width: size * 0.34,
          height: size * 0.34,
          background:
            "radial-gradient(circle at 38% 32%, var(--gold-lit), var(--gold) 55%, color-mix(in oklab, var(--gold) 70%, #000) 100%)",
          boxShadow:
            "0 0 18px 2px rgb(var(--star-glow) / 0.7), 0 0 48px 8px rgb(var(--star-glow) / 0.35)",
          filter: `brightness(${cfg.bright + amp * 0.15})`,
        }}
        animate={reduce ? {} : { scale: cfg.scale }}
        transition={coreTransition}
      >
        {/* the bright nucleus */}
        <span
          className="absolute left-[34%] top-[28%] h-1/4 w-1/4 rounded-full"
          style={{ background: "var(--gold-lit)", filter: "blur(0.5px)" }}
        />
      </motion.span>
    </div>
  );
}
