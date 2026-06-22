import { and, desc, eq, gte } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { summaries } from "@/lib/db/schema";
import { GenerateRecap } from "@/components/recap/generate-recap";
import { renderRecap } from "@/components/recap/render-recap";

// The weekly recap — a reflective letter from Socrates over the week's thoughts,
// not a report. If one exists for the current week, render it; otherwise a calm
// invitation to gather the week.

export const dynamic = "force-dynamic";

/** Start of the current recap window: 7 days ago, midnight UTC. */
function weekStart(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const RANGE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

export default async function RecapPage() {
  const { userId } = await requireProfile();
  const since = weekStart();

  const rows = await db
    .select({
      content: summaries.content,
      periodStart: summaries.periodStart,
      periodEnd: summaries.periodEnd,
      createdAt: summaries.createdAt,
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, userId),
        eq(summaries.kind, "weekly"),
        gte(summaries.periodStart, since),
      ),
    )
    .orderBy(desc(summaries.createdAt))
    .limit(1);

  const recap = rows[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-10 border-b border-hairline pb-6">
        <p className="label-mono mb-3">
          <span className="text-accent">&rsaquo;</span> Weekly recap
        </p>
        <h1 className="text-balance font-display text-3xl font-medium tracking-tight text-marble sm:text-4xl">
          The week, reflected back.
        </h1>
      </header>

      {recap ? (
        <section>
          <p className="label-mono mb-6">
            FIG.01 &mdash; {RANGE_FMT.format(new Date(recap.periodStart))} &ndash;{" "}
            {RANGE_FMT.format(new Date(recap.periodEnd))}
          </p>
          <article className="border-l border-hairline pl-6 font-sans sm:pl-8">
            {renderRecap(recap.content)}
          </article>
        </section>
      ) : (
        <section className="rounded-md border border-hairline bg-raised p-8 sm:p-10">
          <p className="label-mono mb-4">No reflection on file</p>
          <p className="text-pretty font-sans text-lg leading-relaxed text-marble">
            Nothing gathered for this week yet. When you&rsquo;re ready, I&rsquo;ll
            read back over what you&rsquo;ve been turning over &mdash; the threads
            that keep returning, the tensions still open &mdash; and hand it back
            to you, so you can see your own thinking more clearly.
          </p>
          <div className="mt-8">
            <GenerateRecap />
          </div>
        </section>
      )}
    </div>
  );
}
