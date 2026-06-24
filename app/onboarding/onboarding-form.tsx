"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { upsertProfile, type OnboardingState } from "./actions";

// A small, dependable fallback set in case the runtime can't enumerate zones
// (older engines without Intl.supportedValuesOf). The detected zone is always
// merged in so the user's own zone is never missing.
const FALLBACK_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function detectZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function listZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported && supported.length) return supported;
  } catch {
    // fall through to the fallback list
  }
  return FALLBACK_ZONES;
}

/** The current wall-clock time in a given IANA zone, for confirmation. */
function localTimeIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "";
  }
}

type Props = {
  defaults: {
    displayName: string;
    timezone: string;
    dailyCallTime: string;
    phoneE164: string;
  };
};

const FIELD =
  "h-11 w-full rounded-sm border border-hairline-strong bg-raised-2 px-3.5 font-sans text-sm text-marble outline-none transition-colors duration-200 placeholder:text-marble-dim hover:border-accent/50 focus:border-accent disabled:opacity-50";

function Field({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label-mono mb-2 block">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-marble-dim">
          {hint}
        </p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="accent"
      size="lg"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Saving…" : "Begin"}
    </Button>
  );
}

export function OnboardingForm({ defaults }: Props) {
  const reduce = useReducedMotion();
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    upsertProfile,
    {},
  );

  // the chosen IANA zone, picked from a validated list rather than typed freely
  const [timezone, setTimezone] = useState(defaults.timezone);

  // detect the browser's timezone for the default when none is saved yet — a
  // one-time client init (SSR can't know the zone), guarded by the saved value
  useEffect(() => {
    if (defaults.timezone) return;
    const tz = detectZone();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only default
    if (tz) setTimezone(tz);
  }, [defaults.timezone]);

  // the full IANA list, with the saved/detected zone guaranteed present and the
  // whole thing sorted so the picker is searchable by typing
  const zones = useMemo(() => {
    const set = new Set(listZones());
    const detected = detectZone();
    if (detected) set.add(detected);
    if (timezone) set.add(timezone);
    return [...set].sort();
  }, [timezone]);

  // a live confirmation that the chosen zone is the user's actual day — derived
  // in render (no state) so it stays lint-clean; a 30s ticker nudges a re-render
  const localNow = timezone ? localTimeIn(timezone) : "";
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.form
      action={formAction}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-10 flex flex-col gap-6"
    >
      <Field htmlFor="displayName" label="What should I call you?">
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          autoFocus={!defaults.displayName}
          maxLength={80}
          autoComplete="given-name"
          defaultValue={defaults.displayName}
          placeholder="A name, a nickname — whatever feels right"
          className={FIELD}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          htmlFor="timezone"
          label="Your time zone"
          hint={
            timezone && localNow
              ? `So the call lands in your own day — it's ${localNow} there now.`
              : "So the call lands in your own day."
          }
        >
          <select
            id="timezone"
            name="timezone"
            required
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={`${FIELD} font-mono`}
          >
            {/* an empty option forces a deliberate choice if detection failed */}
            {!timezone && (
              <option value="" disabled>
                Choose your time zone…
              </option>
            )}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>

        <Field
          htmlFor="dailyCallTime"
          label="When should I call?"
          hint="A local time, 24-hour. You can change it later."
        >
          <input
            id="dailyCallTime"
            name="dailyCallTime"
            type="time"
            required
            defaultValue={defaults.dailyCallTime || "08:30"}
            className={`${FIELD} font-mono`}
          />
        </Field>
      </div>

      <Field
        htmlFor="phoneE164"
        label="Where can I reach you?"
        hint="The demo can only call a Twilio-verified number — use yours, in full international form (e.g. +1 555 010 0123)."
      >
        <input
          id="phoneE164"
          name="phoneE164"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          defaultValue={defaults.phoneE164}
          placeholder="+1 555 010 0123"
          className={`${FIELD} font-mono`}
        />
      </Field>

      {state.error && (
        <p role="alert" className="font-sans text-sm text-marble-dim">
          {state.error}
        </p>
      )}

      <div className="mt-1">
        <SubmitButton />
      </div>
    </motion.form>
  );
}
