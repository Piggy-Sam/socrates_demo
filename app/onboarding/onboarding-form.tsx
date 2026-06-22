"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { upsertProfile, type OnboardingState } from "./actions";

type Props = {
  defaults: {
    displayName: string;
    timezone: string;
    dailyCallTime: string;
    phoneE164: string;
  };
};

const FIELD =
  "h-11 w-full rounded-sm border border-hairline-strong bg-raised-2 px-3.5 font-sans text-sm text-marble outline-none transition-colors duration-200 placeholder:text-marble-dim/60 hover:border-accent/50 focus:border-accent disabled:opacity-50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-mono mb-2 block">{label}</label>
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
      variant="gold"
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

  // detect the browser's timezone for the default; offer it as the chosen value
  const [timezone, setTimezone] = useState(defaults.timezone);
  useEffect(() => {
    if (defaults.timezone) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {
      // keep the server default (UTC)
    }
  }, [defaults.timezone]);

  return (
    <motion.form
      action={formAction}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-10 flex flex-col gap-6"
    >
      <Field label="What should I call you?">
        <input
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
        <Field label="Your time zone" hint="So the call lands in your own day.">
          <input
            name="timezone"
            type="text"
            required
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g. America/New_York"
            className={`${FIELD} font-mono`}
          />
        </Field>

        <Field
          label="When should I call?"
          hint="A local time, 24-hour. You can change it later."
        >
          <input
            name="dailyCallTime"
            type="time"
            required
            defaultValue={defaults.dailyCallTime || "08:30"}
            className={`${FIELD} font-mono`}
          />
        </Field>
      </div>

      <Field
        label="Where can I reach you?"
        hint="The demo can only call a Twilio-verified number — use yours, in full international form (e.g. +1 555 010 0123)."
      >
        <input
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
