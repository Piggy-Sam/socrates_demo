"use client";

// Route-segment error boundary for the authenticated shell. Every (app) page is
// `force-dynamic` and runs live Drizzle queries against the pooler, which can
// throw transient errors (e.g. "prepared statement does not exist"). Rather than
// let Next's raw crash screen break the instrument's calm, we catch it here and
// offer a composed retry in Socrates' voice. The (app) layout (nav + dot-matrix)
// still wraps this, so we only render the in-content fallback.
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console / platform logs without alarming the reader.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center" role="alert">
      <div className="max-w-xl">
        <p className="label-mono mb-6 text-marble-dim">
          &rsaquo; the thread slipped
        </p>
        <h1 className="text-2xl font-light leading-tight tracking-tight text-balance sm:text-3xl">
          A thought broke off mid-sentence.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-marble-dim text-pretty">
          Nothing of yours is lost. Sometimes the connection wavers and the
          question has to be put again. Gather yourself, and we&rsquo;ll pick the
          thread back up.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Button onClick={() => reset()}>Try again</Button>
          {error.digest ? (
            // A quiet readout for support, never a scolding stack trace.
            <span className="label-mono text-marble-dim">
              ref&nbsp;{error.digest}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
