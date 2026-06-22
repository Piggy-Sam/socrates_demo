import { requireUser, getProfile } from "@/lib/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { OnboardingForm } from "./onboarding-form";

// Must be signed in to onboard. Pre-fills from any existing profile so this
// doubles as a "settings" pass before /today loads.
export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  const defaults = {
    displayName: profile?.displayName ?? "",
    timezone: profile?.timezone ?? "",
    dailyCallTime: profile?.dailyCallTime ?? "",
    phoneE164: profile?.phoneE164 ?? "",
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Wordmark size="sm" href={null} />
          <p className="label-mono mt-8">FIG.01 · Before we begin</p>
          <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-balance sm:text-4xl">
            A few things, and then{" "}
            <span className="text-accent">we begin</span>.
          </h1>
          <p className="mt-4 max-w-sm font-sans text-base leading-relaxed text-marble-dim text-pretty">
            None of this is fixed — you can change it whenever you like.
          </p>
        </div>

        <OnboardingForm defaults={defaults} />
      </div>
    </main>
  );
}
