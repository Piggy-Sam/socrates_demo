import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { CallScreen } from "@/components/call/call-screen";

export const metadata: Metadata = {
  title: "Talk · Socrates",
  description: "Speak with Socrates the moment a thought strikes.",
};

export default async function TalkPage() {
  const { profile } = await requireProfile();

  // The call surface is full-bleed. The authenticated shell wraps children in a
  // padded, max-w-6xl <main>; we break out of that padding so Socrates' presence
  // fills the field edge-to-edge (the one mobile-first, full-presence surface).
  return (
    <div className="-mx-5 -my-8 sm:-mx-8 sm:-my-10">
      <CallScreen displayName={profile.displayName ?? "friend"} />
    </div>
  );
}
