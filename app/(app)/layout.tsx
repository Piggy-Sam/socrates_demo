import { AppNav } from "@/components/app/app-nav";
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
    <div className="flex min-h-dvh flex-col">
      <AppNav displayName={profile.displayName} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
