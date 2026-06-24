import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { summaries } from "@/lib/db/schema";
import { GenerateRecap } from "@/components/recap/generate-recap";
import { renderRecap } from "@/components/recap/render-recap";
import { PageHeader } from "@/components/ui/page-header";

// The weekly recap — a reflective letter from Socrates over a week's thoughts,
// not a report. The MOST RECENT recap always shows (regardless of any 7-day
// window), labelled with its real period; ?w=<n> steps back through prior weeks
// so past reflections never silently vanish. If none exist yet, a calm
// invitation to gather the week.

export const dynamic = "force-dynamic";

const RANGE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { userId } = await requireProfile();
  const { w } = await searchParams;

  // All of this user's weekly recaps, newest first — so the latest always shows
  // and prior weeks stay reachable. Bounded; a person accrues one a week.
  const rows = await db
    .select({
      content: summaries.content,
      periodStart: summaries.periodStart,
      periodEnd: summaries.periodEnd,
      createdAt: summaries.createdAt,
    })
    .from(summaries)
    .where(and(eq(summaries.userId, userId), eq(summaries.kind, "weekly")))
    .orderBy(desc(summaries.createdAt))
    .limit(52);

  // Clamp the requested index into range; 0 is the most recent.
  const want = Number.parseInt(w ?? "0", 10);
  const index =
    Number.isFinite(want) && want > 0 ? Math.min(want, rows.length - 1) : 0;
  const recap = rows[index] ?? null;

  // Prev = an older recap (higher index), Next = a newer one (lower index).
  const hasOlder = index < rows.length - 1;
  const hasNewer = index > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        className="mb-10 border-b border-hairline pb-6"
        kicker="Weekly recap"
        title="The week, reflected back."
      />

      {recap ? (
        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="label-mono">
              FIG.01 &mdash; {RANGE_FMT.format(new Date(recap.periodStart))}{" "}
              &ndash; {RANGE_FMT.format(new Date(recap.periodEnd))}
            </p>
            {/* browse prior weeks — quiet hairline steppers, never a metric */}
            {(hasOlder || hasNewer) && (
              <nav className="flex items-center gap-3" aria-label="Browse recaps">
                <RecapStep
                  href={hasOlder ? `/recap?w=${index + 1}` : null}
                  dir="older"
                />
                <RecapStep
                  href={hasNewer ? `/recap?w=${index - 1}` : null}
                  dir="newer"
                />
              </nav>
            )}
          </div>
          <article className="border-l border-hairline pl-6 font-sans sm:pl-8">
            {renderRecap(recap.content)}
          </article>
        </section>
      ) : (
        <section className="rounded-md border border-hairline bg-raised p-8 sm:p-10">
          <p className="label-mono mb-4">No reflection on file</p>
          <p className="text-pretty font-sans text-lg leading-relaxed text-marble">
            Nothing gathered yet. When you&rsquo;re ready, I&rsquo;ll read back
            over what you&rsquo;ve been turning over &mdash; the threads that keep
            returning, the tensions still open &mdash; and hand it back to you, so
            you can see your own thinking more clearly.
          </p>
          <div className="mt-8">
            <GenerateRecap />
          </div>
        </section>
      )}
    </div>
  );
}

// One quiet stepper through prior/later recaps. Disabled ends render as inert
// dim glyphs (no link) so the row stays stable. Mono + dim — the page's single
// rationed accent stays on the reflection itself.
function RecapStep({
  href,
  dir,
}: {
  href: string | null;
  dir: "older" | "newer";
}) {
  const label = dir === "older" ? "Older week" : "Newer week";
  const Icon = dir === "older" ? ArrowLeft : ArrowRight;
  const glyph = <Icon className="size-3.5" strokeWidth={1.6} aria-hidden />;

  if (!href) {
    return (
      <span
        aria-hidden
        className="label-mono inline-flex items-center gap-1 text-marble-dim/40"
      >
        {dir === "older" ? glyph : null}
        {dir === "older" ? "older" : "newer"}
        {dir === "newer" ? glyph : null}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="label-mono inline-flex items-center gap-1 text-marble-dim transition-colors hover:text-accent"
    >
      {dir === "older" ? glyph : null}
      {dir === "older" ? "older" : "newer"}
      {dir === "newer" ? glyph : null}
    </Link>
  );
}
