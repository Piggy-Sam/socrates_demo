import { requireProfile } from "@/lib/auth";
import { ChatClient } from "./chat-client";

// The text chat — the same mind as the call, in writing. A calm transcript that
// reads like a commonplace book, not a feed. The shell (nav + guard) comes from
// app/(app)/layout.tsx; here we set the framing and hand off to the client.
export default async function ChatPage() {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="mb-6 sm:mb-8">
        <p className="label-mono mb-3">&rsaquo; think out loud, in text</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-marble sm:text-4xl">
          Chat
        </h1>
        <p className="text-pretty mt-3 max-w-prose font-sans text-marble-dim">
          Writing is thinking made visible. The same instrument, in text
          &mdash; Socrates asks, mirrors, and mostly keeps out of your way, so
          the page works on your own mind.
        </p>
      </header>

      <ChatClient displayName={profile.displayName ?? null} />
    </div>
  );
}
