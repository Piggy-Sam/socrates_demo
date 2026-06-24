"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneCall, SlidersHorizontal, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button, LinkButton } from "@/components/ui/button";

type Status = "idle" | "calling" | "ringing" | "error" | "blocked";

/**
 * The Buy-Me-a-Coffee "Help me pay for Twilio" button. Their button.prod.min.js
 * reads its own data-* attributes and injects the styled anchor where the script
 * sits — so we mount the script into a ref'd host on the client only.
 */
function BmcButton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || host.querySelector("script")) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    s.setAttribute("data-name", "bmc-button");
    s.setAttribute("data-slug", "yancun");
    s.setAttribute("data-color", "#4d7cff");
    s.setAttribute("data-emoji", "😢");
    s.setAttribute("data-font", "Arial");
    s.setAttribute("data-text", "Help me pay for Twilio");
    s.setAttribute("data-outline-color", "#ffffff");
    s.setAttribute("data-font-color", "#ffffff");
    s.setAttribute("data-coffee-color", "#FFDD00");
    host.appendChild(s);
  }, []);
  return <div ref={ref} className="flex min-h-[3.25rem] justify-center" />;
}

// A quiet, secondary way to think out loud: ask Socrates to call you. Voice is
// one feature, never the headline — so this is an outline action, not the
// page's accent. POSTs to /api/calls/trigger. When there's no number on file we
// don't offer a button that fails after a click — we point gently to settings.
// The transient "ringing" state borrows the accent as a status cue and offers a
// quiet way back so it isn't a one-way door. Real calls only work for the owner
// (Twilio trial), so everyone else gets a cheeky "no budget" pop-up → Talk now.
export function CallMeNow({
  phone,
  hasPhone,
  className = "",
}: {
  phone?: string | null;
  // whether a usable number is on file; defaults to deriving it from `phone`
  hasPhone?: boolean;
  className?: string;
}) {
  const phoneOnFile = hasPhone ?? Boolean(phone?.trim());
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

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; blocked?: boolean }
        | null;

      // Real calls only reach the owner's Twilio-verified number. For demo
      // sessions and everyone else the server replies 200 with { blocked: true }
      // — not a failure: open the cheeky "no Twilio budget" pop-up.
      if (body?.blocked) {
        setStatus("blocked");
        setMessage(
          body.error ||
            "Sorry — I don't got the money to pay for Twilio, so Socrates AI can't give you a call yet…",
        );
        return;
      }

      if (!res.ok) {
        setStatus("error");
        // Surface the specific reason the server (or ElevenLabs/Twilio) gave —
        // e.g. a trial-account "number is unverified" message — so the cause is
        // legible; fall back to calm generic copy only when there's nothing.
        setMessage(
          body?.error ||
            "Couldn't place the call just now. Try again in a moment.",
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

  // No number on file: guide to settings rather than offer a button that errors
  // after the click. Same outline weight as the live action — calm, not a scold.
  if (!phoneOnFile) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <LinkButton href="/onboarding" variant="outline" size="lg">
          <SlidersHorizontal className="size-4" strokeWidth={1.6} />
          Add a number to be called
        </LinkButton>
        <p className="font-sans text-sm leading-relaxed text-marble-dim text-pretty">
          Give me a number in settings and I can call you here.
        </p>
      </div>
    );
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
        {/* a quiet way back — the ringing state isn't a one-way door */}
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className="label-mono self-start text-marble-dim transition-colors hover:text-marble"
        >
          done
        </button>
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
        {/* Overlay both states in one grid cell: an invisible sizer reserves the
            width of the LONGEST label so the button never resizes, and the live
            content sits centred on top — the label swaps in place, no jump, no
            overlap, no width thrash. */}
        <span className="grid place-items-center">
          <span
            aria-hidden
            className="col-start-1 row-start-1 inline-flex items-center gap-2.5 whitespace-nowrap invisible"
          >
            <Phone className="size-4" strokeWidth={1.6} />
            Placing the call…
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center gap-2.5 whitespace-nowrap">
            <motion.span
              aria-hidden
              className="inline-block"
              animate={
                calling && !reduce ? { rotate: [0, 14, -14, 0] } : { rotate: 0 }
              }
              transition={
                calling && !reduce
                  ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0 }
              }
            >
              <Phone className="size-4" strokeWidth={1.6} />
            </motion.span>
            {calling ? "Placing the call…" : "Call me now"}
          </span>
        </span>
      </Button>

      {status === "error" && message && (
        <p className="font-sans text-sm text-marble-dim text-pretty">
          {message}
        </p>
      )}

      {/* The cheeky "no Twilio budget" pop-up — shown to demo + everyone who
          isn't the owner. Support button stacked right on top of "Talk now". */}
      {status === "blocked" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Calls are unavailable"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm animate-[fade-rise_0.25s_var(--ease-instrument)_both]"
          onClick={() => setStatus("idle")}
        >
          <div
            className="relative w-full max-w-sm rounded-lg border border-hairline bg-raised p-7 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setStatus("idle")}
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-sm text-marble-dim transition-colors hover:text-marble"
            >
              <X className="size-4" strokeWidth={1.6} />
            </button>
            <p className="label-mono text-marble-dim">FIG.404 · NO BUDGET</p>
            <h3 className="mt-3 font-display text-xl font-normal tracking-tight text-marble">
              Can&apos;t call you (yet)
            </h3>
            <p className="mt-2.5 font-sans text-sm leading-relaxed text-marble-dim text-pretty">
              {message} 😢
            </p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-marble-dim text-pretty">
              But you can still have the whole conversation right here in the
              browser — same Socrates, no phone needed.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              {/* sneak in the support button, right on top of Talk now */}
              <BmcButton />
              <LinkButton
                href="/talk"
                variant="accent"
                size="lg"
                className="w-full"
              >
                <Phone className="size-4" strokeWidth={1.6} />
                Talk now instead
              </LinkButton>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="label-mono text-marble-dim transition-colors hover:text-marble"
              >
                maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
