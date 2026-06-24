"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

// Quiet take-away controls for a rendered recap — the thinking stays yours.
// Copy puts the recap's own markdown on the clipboard; Download builds a Blob
// and triggers a .md download. Hairline + FIG mono, restrained — not buttons
// that shout. Reuses the recap's already-assembled markdown (`content`).

export function RecapTakeaway({
  content,
  filename = "socrates-recap.md",
}: {
  content: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (insecure context / denied) — quietly no-op
    }
  }

  function download() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8 flex items-center gap-5 border-t border-hairline pt-5">
      <p className="label-mono text-marble-dim/70">Yours to take</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={copy}
          className="label-mono inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
        >
          {copied ? (
            <Check className="size-3.5" strokeWidth={1.6} aria-hidden />
          ) : (
            <Copy className="size-3.5" strokeWidth={1.6} aria-hidden />
          )}
          {copied ? "copied" : "copy"}
        </button>
        <button
          type="button"
          onClick={download}
          className="label-mono inline-flex items-center gap-1.5 text-marble-dim transition-colors hover:text-accent"
        >
          <Download className="size-3.5" strokeWidth={1.6} aria-hidden />
          download .md
        </button>
      </div>
    </div>
  );
}
