import { requireProfile } from "@/lib/auth";
import { ChatClient } from "./chat-client";
import { resolveCallSeed, resolveEntrySeed } from "./queries";

export const dynamic = "force-dynamic";

// A fresh conversation. The shell (nav + guard) comes from app/(app)/layout.tsx;
// the conversation-history sidebar from app/(app)/chat/layout.tsx. A new session
// row is created lazily on the first message, then this thread becomes resumable
// at /chat/[id]. The framing copy now lives in the empty state inside ChatClient.
//
// Closing the loop: ?from=<entryId> (a banked thought) or ?fromCall=<sessionId>
// (a finished call) carries a thought BACK into thinking. The seed is resolved
// server-side against the user's own rows — never trusting client-supplied text —
// into a one-line prompt that PREFILLS, but does not auto-send, the composer.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; fromCall?: string }>;
}) {
  const { userId, profile, isDemo } = await requireProfile();
  const { from, fromCall } = await searchParams;

  let seed: string | null = null;
  if (from) seed = await resolveEntrySeed(userId, from);
  else if (fromCall) seed = await resolveCallSeed(userId, fromCall);

  return (
    <ChatClient
      displayName={profile.displayName ?? null}
      initialTurns={[]}
      initialSessionId={null}
      seed={seed}
      isDemo={isDemo}
    />
  );
}
