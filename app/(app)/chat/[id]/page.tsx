import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadChatSession } from "../queries";
import { ChatClient } from "../chat-client";

// Resume a saved conversation. Loads its turns (ownership-checked) and hands them
// to the same ChatClient as initial state, so the thread continues seamlessly.
export default async function ResumeChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();

  const turns = await loadChatSession(userId, id);
  if (turns === null) notFound();

  return (
    <ChatClient
      displayName={profile.displayName ?? null}
      initialTurns={turns}
      initialSessionId={id}
    />
  );
}
