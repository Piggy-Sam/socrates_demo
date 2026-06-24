import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitch/pitch-deck";
import "./pitch.css";

export const metadata: Metadata = {
  title: "Socrates AI — Pitch",
  description:
    "AI that sharpens your thinking instead of replacing it. A ten-slide pitch for human agency in AI-mediated decisions.",
};

// The pitch deck is a standalone surface: no app nav/chrome. We force the
// brand's dramatic dark look by scoping data-theme="dark" to this wrapper — the
// CSS custom properties are defined under [data-theme="dark"] in globals.css and
// cascade to every descendant, so the whole deck renders in Ink Navy regardless
// of the user's chosen theme.
export default function PitchPage() {
  return (
    <div data-theme="dark" className="min-h-dvh bg-ink text-marble">
      <PitchDeck />
    </div>
  );
}
