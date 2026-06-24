import { AppNav } from "@/components/app/app-nav";
import { DotMatrix } from "@/components/decor/dot-matrix";
import { requireProfile } from "@/lib/auth";

// The authenticated shell. Guards every child route: no session → /login,
// no completed profile → /onboarding.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    // --nav-h is the rendered height of the sticky AppNav header; full-bleed
    // surfaces (e.g. /talk) size themselves against it so their controls never
    // fall under the nav or below the fold.
    <div className="flex min-h-dvh flex-col [--nav-h:3.75rem]">
      {/* the living dot-matrix, very faint behind the whole app */}
      <div className="fixed inset-0 -z-10">
        <DotMatrix intensity={0.5} />
      </div>
      <AppNav displayName={profile.displayName} />
      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
