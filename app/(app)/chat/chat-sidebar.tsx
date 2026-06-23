"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, PanelLeft, X } from "lucide-react";
import type { ChatListItem } from "./queries";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SidebarBody({
  sessions,
  pathname,
  onNavigate,
}: {
  sessions: ChatListItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const onNew = pathname === "/chat";
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/chat"
        onClick={onNavigate}
        aria-current={onNew ? "page" : undefined}
        className={`label-mono flex items-center gap-2 rounded-sm border px-3 py-2.5 transition-colors ${
          onNew
            ? "border-accent text-accent"
            : "border-hairline text-marble-dim hover:border-hairline-strong hover:text-marble"
        }`}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        New chat
      </Link>

      <p className="label-mono mt-6 mb-2 px-1 text-marble-dim">
        &rsaquo; conversations
      </p>

      <nav className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
        {sessions.length === 0 ? (
          <p className="px-2 py-2 font-sans text-sm text-marble-dim">
            Nothing yet. Conversations appear here once you&rsquo;ve sent a
            message and Socrates has replied.
          </p>
        ) : (
          sessions.map((s) => {
            const href = `/chat/${s.id}`;
            const active = pathname === href;
            return (
              <Link
                key={s.id}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`block rounded-sm px-2.5 py-2 transition-colors ${
                  active
                    ? "bg-raised text-marble"
                    : "text-marble-dim hover:bg-raised/60 hover:text-marble"
                }`}
              >
                <span className="block truncate font-sans text-[0.9375rem] leading-snug text-current">
                  {s.title}
                </span>
                <span className="label-mono mt-0.5 block text-marble-dim">
                  {relativeTime(s.lastActivity)}
                </span>
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}

export function ChatSidebar({ sessions }: { sessions: ChatListItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: a persistent left column. */}
      <aside className="hidden w-56 shrink-0 md:block lg:w-64">
        <div className="sticky top-24 max-h-[calc(100dvh-8rem)]">
          <SidebarBody sessions={sessions} pathname={pathname} />
        </div>
      </aside>

      {/* Mobile: a toggle that opens a slide-over. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label-mono mb-4 inline-flex items-center gap-2 self-start rounded-sm border border-hairline px-3 py-2 text-marble-dim transition-colors hover:text-marble md:hidden"
        aria-label="Open conversations"
      >
        <PanelLeft className="size-3.5" strokeWidth={1.8} />
        Conversations
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs border-r border-hairline bg-ink p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="label-mono text-marble-dim">Conversations</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex size-8 items-center justify-center rounded-sm border border-hairline text-marble-dim hover:text-marble"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>
            <SidebarBody
              sessions={sessions}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
