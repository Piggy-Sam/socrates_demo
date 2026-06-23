import { requireProfile } from "@/lib/auth";
import { ChatClient } from "./chat-client";

// A fresh conversation. The shell (nav + guard) comes from app/(app)/layout.tsx;
// the conversation-history sidebar from app/(app)/chat/layout.tsx. A new session
// row is created lazily on the first message, then this thread becomes resumable
// at /chat/[id]. The framing copy now lives in the empty state inside ChatClient.
export default async function ChatPage() {
  const { profile } = await requireProfile();

  return (
    <ChatClient
      displayName={profile.displayName ?? null}
      initialTurns={[]}
      initialSessionId={null}
    />
  );
}
