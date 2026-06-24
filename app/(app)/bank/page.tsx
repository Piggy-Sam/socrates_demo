// The bank — the field of your thinking. Every thought you've worked out,
// plotted as a dot-matrix field (field view) and kept as a commonplace ledger
// (list view). Calm, precise, no metrics-as-pressure. Scoped to the signed-in user.

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { requireProfile } from "@/lib/auth";
import { BankView, type BankEntry } from "@/components/bank/bank-view";
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
      <header className="pb-7">
        <p className="label-mono mb-3">The field of your thinking</p>
        <h1 className="font-display text-4xl font-light tracking-tight text-marble sm:text-5xl">
          The bank
        </h1>
        <p className="mt-4 max-w-xl font-sans text-lg leading-relaxed text-marble-dim text-pretty">
          Everything you&apos;ve worked out here, kept. Each thought a point;
          the ones you keep returning to plot brighter and larger, until the
          shape of your thinking stands out on its own.
        </p>
      </header>

      <BankView entries={bankEntries} />
    </div>
  );
}
