// The bank — the field of your thinking. Every thought you've worked out,
// plotted as a dot-matrix field (field view) and kept as a commonplace ledger
// (list view). Calm, precise, no metrics-as-pressure. Scoped to the signed-in user.

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { requireProfile } from "@/lib/auth";
import { BankView, type BankEntry } from "@/components/bank/bank-view";
import { PageHeader } from "@/components/ui/page-header";
import type { EntryType } from "@/lib/constellation";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const { userId } = await requireProfile();

  const entryRows = await db
    .select({
      id: entries.id,
      type: entries.type,
      content: entries.content,
      themes: entries.themes,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.createdAt))
    .limit(400);

  const bankEntries: BankEntry[] = entryRows.map((e) => ({
    id: e.id,
    type: e.type as EntryType,
    content: e.content,
    themes: e.themes ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        className="pb-7"
        kicker="The field of your thinking"
        title="The bank"
        intro="Everything you've worked out here, kept. Each thought a point; the ones you keep returning to plot brighter and larger, until the shape of your thinking stands out on its own."
      />

      <BankView entries={bankEntries} />

      {/* Anti-lock-in — the thinking stays yours. Quiet hairline footer; the
          .md export is plain markdown, ?format=json for true portability. */}
      <footer className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-5">
        <p className="label-mono text-marble-dim/70">
          Your thinking is yours to take
        </p>
        <a
          href="/api/export/bank"
          className="label-mono text-marble-dim transition-colors hover:text-accent"
        >
          export the bank (.md)
        </a>
        <a
          href="/api/export/bank?format=json"
          className="label-mono text-marble-dim/70 transition-colors hover:text-accent"
        >
          json
        </a>
      </footer>
    </div>
  );
}
