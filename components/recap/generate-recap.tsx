"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { renderRecap } from "./render-recap";

/**
 * On-demand weekly recap. Calls POST /api/recap/generate and renders the
 * returned reflection in place — a letter, not a report. Used by the recap page
 * when no weekly summary exists yet for the current week.
 */
export function GenerateRecap() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/recap/generate", { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        content?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.content) {
        setError(data.error || "Couldn't gather the week just now.");
        setState("error");
        return;
      }
      setContent(data.content);
      setState("done");
      // The recap is now persisted; re-fetch the server page so it re-renders
      // with the canonical FIG date header (the real period) around the letter,
      // matching how an already-existing recap is shown. The in-place article
      // below covers the brief gap before the refresh resolves.
      router.refresh();
    } catch {
      setError("Something interrupted that. Try again in a moment.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <motion.article
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="border-l border-hairline pl-6 font-sans sm:pl-8"
      >
        {renderRecap(content)}
      </motion.article>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <Button
        variant="accent"
        size="md"
        onClick={generate}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <>
            Gathering the week
            <span className="cursor-blink ml-0.5 inline-block h-[0.95em] w-[0.5em] align-[-0.08em]" />
          </>
        ) : (
          "Gather the week"
        )}
      </Button>
      {state === "error" && (
        <p className="font-sans text-sm text-marble-dim">{error}</p>
      )}
    </div>
  );
}
