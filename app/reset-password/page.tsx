"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { DotMatrix } from "@/components/decor/dot-matrix";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Where the password-recovery link lands. The /auth/callback route verifies the
// recovery token (creating a temporary session), then redirects here, so the
// browser client can set a new password via updateUser(). Also used to set an
// initial password on an account that only ever signed in by magic link.
const INPUT_CLS =
  "h-11 w-full rounded-sm border border-hairline-strong bg-raised-2 pl-8 pr-3.5 font-mono-display text-sm text-marble outline-none transition-colors duration-200 placeholder:text-marble-dim hover:border-accent/50 focus:border-accent disabled:opacity-50";

export default function ResetPasswordPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = status === "working";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setError(null);
    setStatus("working");
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setStatus("idle");
      setError(
        /session|jwt|missing|not authenticated/i.test(err.message)
          ? "Open the reset link from your email first, then set your password here."
          : err.message || "Couldn't set your password. Try again.",
      );
      return;
    }

    setStatus("done");
    // The recovery session is now a full session — head into the app.
    setTimeout(() => {
      router.push("/today");
      router.refresh();
    }, 900);
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

          {status === "done" ? (
            <div className="mt-7 flex flex-col items-center">
              <p className="label-mono">FIG.00 · Password set</p>
              <span
                aria-hidden
                className="mt-5 flex size-11 items-center justify-center rounded-sm border border-accent text-accent"
              >
                <Check strokeWidth={1.8} className="size-5" />
              </span>
              <p className="mt-6 max-w-xs font-sans text-base leading-relaxed text-marble text-pretty">
                Your password is set. Taking you in&hellip;
              </p>
            </div>
          ) : (
            <>
              <p className="label-mono mt-7">FIG.00 · Set a password</p>
              <p className="mt-3 max-w-xs font-sans text-base leading-relaxed text-marble text-pretty">
                Choose a password — you&rsquo;ll use it to sign in from now on.
              </p>

              <form onSubmit={onSubmit} className="mt-8 w-full text-left">
                <label htmlFor="password" className="label-mono mb-2 block">
                  New password
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
                    autoComplete="new-password"
                    autoFocus
                    placeholder="at least 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={busy}
                    className={INPUT_CLS}
                  />
                </div>

                <label
                  htmlFor="confirm"
                  className="label-mono mb-2 mt-4 block"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-display text-sm text-accent"
                  >
                    ›
                  </span>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="again"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={busy}
                    className={INPUT_CLS}
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
                  disabled={busy}
                  className="mt-5 w-full"
                >
                  {busy ? "Setting…" : "Set password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
