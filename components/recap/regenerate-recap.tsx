"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

// Quiet "regenerate" control for the recap currently in view. Re-runs the
// reflection over the SAME week — POST /api/recap/regenerate with that week's
// periodStart/periodEnd — overwriting the old row rather than appending a new
// one. Hairline + FIG mono, hover→accent, matching RecapTakeaway. In-flight it
// shows the blink cursor and goes aria-busy/disabled; on success the server
// page refreshes with the fresh letter.

export function RegenerateRecap({
  periodStart,
  periodEnd,
}: {
  periodStart: string;
  periodEnd: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function regenerate() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/recap/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Couldn't gather that week again just now.");
        setState("error");
        return;
      }
      // The week's row is replaced; re-fetch the server page so it re-renders
      // the fresh letter in place.
      setState("idle");
      router.refresh();
    } catch {
      setError("Something interrupted that. Try again in a moment.");
      setState("error");
    }
  }

  const loading = state === "loading";

  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={regenerate}
        disabled={loading}
        aria-busy={loading}
        className="label-mono inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent disabled:hover:text-marble-dim"
      >
        {loading ? (
          <>
            regenerating
            <span className="cursor-blink ml-0.5 inline-block h-[0.9em] w-[0.45em] align-[-0.06em]" />
          </>
        ) : (
          <>
            <RotateCw className="size-3.5" strokeWidth={1.6} aria-hidden />
            regenerate
          </>
        )}
      </button>
      {state === "error" && (
        <span className="font-sans text-sm text-marble-dim">{error}</span>
      )}
    </div>
  );
}
