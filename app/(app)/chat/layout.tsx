import { requireProfile } from "@/lib/auth";
import { getChatSessionList } from "./queries";
import { ChatSidebar } from "./chat-sidebar";

export const dynamic = "force-dynamic";

// The chat segment's own shell: a conversation-history sidebar alongside the
// active thread. Shared by /chat (new) and /chat/[id] (resume). The list is
// re-fetched whenever the route re-renders (incl. router.refresh() after a new
// thread's first message), so freshly started chats appear without a reload.
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireProfile();
  const sessions = await getChatSessionList(userId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:gap-8 lg:gap-12">
      <ChatSidebar sessions={sessions} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
