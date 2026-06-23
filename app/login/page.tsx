"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { DotMatrix } from "@/components/decor/dot-matrix";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "signup";
type Sent = { kind: "link" | "reset" | "confirm"; email: string };

// Map Supabase auth errors to calm, honest copy. Crucially: never tell the user
// to "try again" on a rate limit — that just burns more of the email budget.
function friendlyAuthError(err: {
  message?: string;
  status?: number;
  code?: string;
}): string {
  const msg = err?.message ?? "";
  if (err?.status === 429 || /rate limit/i.test(msg)) {
    return "Too many sign-in emails just now. Wait a few minutes — or sign in with your password.";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "That email and password don't match. Check them, or reset your password.";
  }
  if (/already registered|already been registered/i.test(msg)) {
    return "That email already has an account — sign in instead.";
  }
  if (/at least 6|password should be/i.test(msg)) {
    return "Use a password of at least 6 characters.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Confirm your email first — open the confirmation link we sent.";
  }
  return msg || "Something went wrong. Try again in a moment.";
}

const INPUT_CLS =
  "h-11 w-full rounded-sm border border-hairline-strong bg-raised-2 pl-8 pr-3.5 font-mono-display text-sm text-marble outline-none transition-colors duration-200 placeholder:text-marble-dim hover:border-accent/50 focus:border-accent disabled:opacity-50";

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") || "/today";
  const authError = params.get("error");
  const reduce = useReducedMotion();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [sent, setSent] = useState<Sent | null>(null);
  const [error, setError] = useState<string | null>(
    authError ? "That link didn't work. Let's try again." : null,
  );

  const busy = status === "working";

  const callbackUrl = (nextPath: string) =>
    `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  function switchMode(to: Mode) {
    setMode(to);
    setError(null);
  }

  // Primary path: email + password — sign in, or create an account.
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("That doesn't look like an email yet.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }

    setError(null);
    setStatus("working");
    const supabase = createClient();

    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: value,
        password,
      });
      if (err) {
        setStatus("idle");
        setError(friendlyAuthError(err));
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    // sign up: if email confirmation is off, a session comes back immediately;
    // otherwise the user must confirm via email first.
    const { data, error: err } = await supabase.auth.signUp({
      email: value,
      password,
      options: { emailRedirectTo: callbackUrl(next) },
    });
    if (err) {
      setStatus("idle");
      setError(friendlyAuthError(err));
      return;
    }
    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }
    setStatus("idle");
    setSent({ kind: "confirm", email: value });
  }

  // Fallback: passwordless magic link (the original flow).
  async function sendMagicLink() {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter your email first, then I'll send a link.");
      return;
    }
    setError(null);
    setStatus("working");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: callbackUrl(next) },
    });
    setStatus("idle");
    if (err) {
      setError(friendlyAuthError(err));
      return;
    }
    setSent({ kind: "link", email: value });
  }

  async function sendReset() {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter your email first, then I'll send a reset link.");
      return;
    }
    setError(null);
    setStatus("working");
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: callbackUrl("/reset-password"),
    });
    setStatus("idle");
    if (err) {
      setError(friendlyAuthError(err));
      return;
    }
    setSent({ kind: "reset", email: value });
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="fixed inset-0 -z-10">
        <DotMatrix />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-sm rounded-md border border-hairline bg-raised px-7 py-9 sm:px-9 sm:py-10"
      >
        <div className="flex flex-col items-center text-center">
          <Wordmark size="md" href="/" />

          {sent ? (
            <Sent sent={sent} />
          ) : (
            <>
              <p className="label-mono mt-7">
                FIG.00 · {mode === "signin" ? "Sign in" : "Create account"}
              </p>
              <p className="mt-3 max-w-xs font-sans text-base leading-relaxed text-marble text-pretty">
                An instrument for the examined life.{" "}
                {mode === "signin"
                  ? "Sign in to keep sharpening your own thinking."
                  : "Make an account, and we'll begin."}
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
                    disabled={busy}
                    className={INPUT_CLS}
                  />
                </div>

                <label
                  htmlFor="password"
                  className="label-mono mb-2 mt-4 block"
                >
                  Password
                </label>
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-display text-sm text-accent"
                  >
                    ›
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder={
                      mode === "signin" ? "your password" : "at least 6 characters"
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={busy}
                    className={INPUT_CLS}
                  />
                </div>

                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={sendReset}
                    disabled={busy}
                    className="mt-2.5 rounded-sm font-sans text-xs text-marble-dim underline-offset-2 transition-colors hover:text-marble hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}

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
                  disabled={busy}
                  className="mt-5 w-full"
                >
                  {busy
                    ? "…"
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </form>

              <p className="mt-6 font-sans text-xs leading-relaxed text-marble-dim">
                {mode === "signin" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="rounded-sm text-marble underline-offset-2 transition-colors hover:underline"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className="rounded-sm text-marble underline-offset-2 transition-colors hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <div className="mt-5 w-full border-t border-hairline pt-5">
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={busy}
                  className="rounded-sm font-sans text-xs text-marble-dim underline-offset-2 transition-colors hover:text-marble hover:underline disabled:opacity-50"
                >
                  Email me a sign-in link instead
                </button>
              </div>
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

function Sent({ sent }: { sent: Sent }) {
  const reduce = useReducedMotion();
  const copy = {
    link: {
      label: "Link sent",
      body: "Check your email — a sign-in link is on its way.",
    },
    reset: {
      label: "Reset link sent",
      body: "Check your email — a link to set a new password is on its way.",
    },
    confirm: {
      label: "Confirm your email",
      body: "Check your email — confirm your address to finish creating your account.",
    },
  }[sent.kind];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-7 flex flex-col items-center"
    >
      <p className="label-mono">FIG.00 · {copy.label}</p>
      <span
        aria-hidden
        className="mt-5 flex size-11 items-center justify-center rounded-sm border border-accent text-accent"
      >
        <Check strokeWidth={1.8} className="size-5" />
      </span>
      <p className="mt-6 max-w-xs font-sans text-base leading-relaxed text-marble text-pretty">
        {copy.body}
      </p>
      {sent.email && (
        <p className="mt-2 font-mono-display text-xs tracking-wide text-marble-dim">
          {sent.email}
        </p>
      )}
      <p className="mt-6 font-sans text-xs leading-relaxed text-marble-dim">
        It can take a minute. You can close this tab once you&rsquo;ve opened the
        link.
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
