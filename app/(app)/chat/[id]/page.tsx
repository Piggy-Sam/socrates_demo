import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadChatSession } from "../queries";
import { ChatClient } from "../chat-client";

export const dynamic = "force-dynamic";

// Resume a saved conversation. Loads its turns (ownership-checked) and hands them
// to the same ChatClient as initial state, so the thread continues seamlessly.
export default async function ResumeChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile, isDemo } = await requireProfile();

  const turns = await loadChatSession(userId, id);

  if (turns === null) {
    // Demo: a new chat lives only in the browser (createChatSession returns a
    // synthetic id without a DB row). After the first send the client navigates
    // here, so a not-in-DB session for a demo visitor is just an empty new chat —
    // render it as such (initialTurns the client already holds stay in memory)
    // rather than 404. Seeded chats still load via loadChatSession above.
    if (isDemo) {
      return (
        <ChatClient
          displayName={profile.displayName ?? null}
          initialTurns={[]}
          initialSessionId={id}
          isDemo
        />
      );
    }
    notFound();
  }

  return (
    <ChatClient
      displayName={profile.displayName ?? null}
      initialTurns={turns}
      initialSessionId={id}
      isDemo={isDemo}
    />
  );
}
