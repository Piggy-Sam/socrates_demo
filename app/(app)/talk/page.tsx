import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { CallScreen } from "@/components/call/call-screen";

export const metadata: Metadata = {
  title: "Talk · Socrates",
  description:
    "Think out loud. One instrument among several — Socrates draws it out, you reason.",
};

export default async function TalkPage() {
  const { profile } = await requireProfile();

  // The voice surface is full-bleed. The authenticated shell wraps children in a
  // padded, max-w-6xl <main>; we break out of the HORIZONTAL padding so Socrates'
  // presence fills the field edge-to-edge. We deliberately keep the vertical
  // padding (no -my hack): CallSurface derives its own height from --nav-h and
  // owns its safe-area insets, so the live controls always stay above the fold.
  return (
    <div className="-mx-5 sm:-mx-8">
      <CallScreen displayName={profile.displayName ?? "friend"} />
    </div>
  );
}
