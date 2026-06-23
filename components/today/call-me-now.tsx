"use client";

import { useState } from "react";
import { Phone, PhoneCall } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "calling" | "ringing" | "error";

// A quiet, secondary way to think out loud: ask Socrates to call you. Voice is
// one feature, never the headline — so this is an outline action, not the
// page's accent. POSTs to /api/calls/trigger (Track E). If that route isn't
// live yet, we fail gracefully with a calm message — never alarming, never
// pressure. The transient "ringing" state borrows the accent as a status cue.
export function CallMeNow({
  phone,
  className = "",
}: {
  phone?: string | null;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const calling = status === "calling";

  async function trigger() {
    if (calling) return;
    setStatus("calling");
    setMessage("");
    try {
      const res = await fetch("/api/calls/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.status === 404) {
        setStatus("error");
        setMessage("Calling isn't wired up yet. Talk now in the browser instead.");
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok) {
        setStatus("error");
        // Surface the specific reason the server (or ElevenLabs/Twilio) gave —
        // e.g. a trial-account "number is unverified" message — so the cause is
        // legible; fall back to calm generic copy only when there's nothing.
        setMessage(
          body?.error ||
            (phone
              ? "Couldn't place the call just now. Try again in a moment."
              : "Add a phone number in your profile first."),
        );
        return;
      }

      setStatus("ringing");
      setMessage("Your phone should ring shortly. Pick up when you're ready.");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the line. Try again in a moment.");
    }
  }

  if (status === "ringing") {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="inline-flex items-center gap-3 rounded-md border border-hairline-strong bg-raised px-4 py-3">
          <motion.span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-accent/12 text-accent"
            animate={reduce ? {} : { scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <PhoneCall className="size-4" strokeWidth={1.6} />
          </motion.span>
          <div>
            <p className="label-mono text-accent">calling you</p>
            <p className="mt-0.5 font-sans text-sm text-marble-dim">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        variant="outline"
        size="lg"
        onClick={trigger}
        disabled={calling}
        aria-busy={calling}
      >
        {calling ? (
          <>
            <motion.span
              aria-hidden
              className="inline-block"
              animate={reduce ? {} : { rotate: [0, 14, -14, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <Phone className="size-4" strokeWidth={1.6} />
            </motion.span>
            Placing the call…
          </>
        ) : (
          <>
            <Phone className="size-4" strokeWidth={1.6} />
            Call me now
          </>
        )}
      </Button>
      {status === "error" && message && (
        <p className="font-sans text-sm text-marble-dim text-pretty">
          {message}
        </p>
      )}
    </div>
  );
}
