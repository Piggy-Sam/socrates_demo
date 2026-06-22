"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/bank", label: "The bank" },
  { href: "/chat", label: "Chat" },
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
        <Wordmark size="sm" />

        <nav className="order-3 flex items-center gap-1 sm:order-2 sm:ml-2">
          {LINKS.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "text-gold"
                    : "text-marble-dim hover:text-marble"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-2.5 sm:order-3">
          <LinkButton href="/talk" variant="gold" size="sm">
            Talk now
          </LinkButton>
          <ThemeToggle />
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
