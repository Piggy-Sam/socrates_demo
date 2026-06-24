"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/bank", label: "The bank" },
  { href: "/chat", label: "Chat" },
  { href: "/calls", label: "Calls" },
  { href: "/recap", label: "Recap" },
] as const;

export function AppNav({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5 sm:px-8">
        <Wordmark size="sm" staticCursor />

        <nav className="order-3 flex items-center gap-0.5 sm:order-2 sm:ml-2">
          {LINKS.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`label-mono inline-flex min-h-10 items-center rounded-sm px-2.5 py-2 transition-colors ${
                  active
                    ? "text-accent"
                    : "text-marble-dim hover:text-marble"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-2.5 sm:order-3">
          {/* "Talk now" is one way to think out loud, never the headline —
              outline, secondary. The single accent is the active nav item.
              Redundant on /talk itself. */}
          {!pathname.startsWith("/talk") && (
            <LinkButton href="/talk" variant="outline" size="sm">
              Talk now
            </LinkButton>
          )}
          <ThemeToggle />
          {/* A quiet door to settings — onboarding doubles as it, pre-filling
              from the saved profile. Not the accent; sits beside sign-out. */}
          <Link
            href="/onboarding"
            aria-current={
              pathname.startsWith("/onboarding") ? "page" : undefined
            }
            aria-label="Settings"
            title="Settings"
            className={`inline-flex size-9 items-center justify-center rounded-sm border border-hairline transition-colors hover:border-hairline-strong hover:text-marble ${
              pathname.startsWith("/onboarding")
                ? "text-accent"
                : "text-marble-dim"
            }`}
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.6} />
          </Link>
          <button
            type="button"
            onClick={signOut}
            aria-label={`Sign out${displayName ? ` (${displayName})` : ""}`}
            title="Sign out"
            className="inline-flex size-9 items-center justify-center rounded-sm border border-hairline text-marble-dim transition-colors hover:border-hairline-strong hover:text-marble"
          >
            <LogOut className="size-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
