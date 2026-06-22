"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { Constellation } from "@/components/sky/constellation";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SAMPLE_SKY } from "@/lib/sample-sky";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/today";
  const authError = params.get("error");
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    authError ? "That link didn't work. Let's try again." : null,
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("That doesn't look like an email yet.");
      return;
    }

    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: redirectTo },
    });

    if (otpError) {
      setStatus("idle");
      setError("Something went wrong sending the link. Try once more?");
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      {/* faint dot-field — graph paper for the instrument, behind everything */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Constellation
          stars={SAMPLE_SKY}
          interactive={false}
          framed={false}
          igniteDuration={2.6}
          className="opacity-25"
        />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-sm rounded-md border border-hairline bg-raised px-7 py-9 sm:px-9 sm:py-10"
      >
        <div className="flex flex-col items-center text-center">
          <Wordmark size="md" href="/" />

          {status === "sent" ? (
            <Sent email={email.trim()} />
          ) : (
            <>
              <p className="label-mono mt-7">FIG.00 · Sign in</p>
              <p className="mt-3 max-w-xs font-sans text-base leading-relaxed text-marble text-pretty">
                An instrument for the examined life. Tell me where to reach you,
                and we'll begin sharpening your own thinking.
              </p>

              <form onSubmit={onSubmit} className="mt-8 w-full text-left">
                <label htmlFor="email" className="label-mono mb-2 block">
                  Email address
                </label>
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-display text-sm text-accent"
                  >
                    ›
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={status === "sending"}
                    className="h-11 w-full rounded-sm border border-hairline-strong bg-raised-2 pl-8 pr-3.5 font-mono-display text-sm text-marble outline-none transition-colors duration-200 placeholder:text-marble-dim hover:border-accent/50 focus:border-accent disabled:opacity-50"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-2.5 font-sans text-sm text-marble-dim"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  disabled={status === "sending"}
                  className="mt-5 w-full"
                >
                  {status === "sending" ? "Sending…" : "Send me a link"}
                </Button>
              </form>

              <p className="mt-6 font-sans text-xs leading-relaxed text-marble-dim">
                No password. We'll email you a link that signs you in.
              </p>
            </>
          )}
        </div>
      </motion.div>

      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-sm font-sans text-sm text-marble-dim transition-colors hover:text-marble sm:left-10 sm:top-8"
      >
        <ArrowLeft strokeWidth={1.6} className="size-4" />
        Back
      </Link>
    </main>
  );
}

function Sent({ email }: { email: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-7 flex flex-col items-center"
    >
      <p className="label-mono">FIG.00 · Link sent</p>
      <span
        aria-hidden
        className="mt-5 flex size-11 items-center justify-center rounded-sm border border-accent text-accent"
      >
        <Check strokeWidth={1.8} className="size-5" />
      </span>
      <p className="mt-6 max-w-xs font-sans text-base leading-relaxed text-marble text-pretty">
        Check your email — a link is on its way.
      </p>
      {email && (
        <p className="mt-2 font-mono-display text-xs tracking-wide text-marble-dim">
          {email}
        </p>
      )}
      <p className="mt-6 font-sans text-xs leading-relaxed text-marble-dim">
        It can take a minute. You can close this tab once you've opened the link.
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
