// Streamed fallback for the authenticated segment. Because every (app) page is
// `force-dynamic` (user-scoped, always-fresh data), navigation can't be served
// from a static cache — so this skeleton is what makes a click feel INSTANT:
// the route shell can be prefetched and shown immediately while the real page
// streams in behind it. On-brand: hairline rules, a mono caption, a calm pulse.
export default function AppLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <p className="label-mono mb-6 text-marble-dim">&rsaquo; thinking&hellip;</p>
      <div className="h-9 w-56 rounded-sm bg-raised" />
      <div className="mt-8 space-y-4">
        <div className="h-px w-full bg-hairline" />
        <div className="h-5 w-[80%] rounded-sm bg-raised" />
        <div className="h-5 w-[64%] rounded-sm bg-raised" />
        <div className="h-5 w-[72%] rounded-sm bg-raised" />
        <div className="h-px w-full bg-hairline" />
        <div className="h-5 w-[58%] rounded-sm bg-raised" />
        <div className="h-5 w-[68%] rounded-sm bg-raised" />
      </div>
    </div>
  );
}
