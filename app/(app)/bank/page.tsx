// The bank — the constellation of your mind. Every thought you've worked out,
// rendered as a personal night sky (sky view) and as a commonplace book (list
// view). Calm, reverent, no metrics-as-pressure. Scoped to the signed-in user.

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, themes } from "@/lib/db/schema";
import { requireProfile } from "@/lib/auth";
import {
  BankView,
  type BankEntry,
  type BankTheme,
} from "@/components/bank/bank-view";
import type { EntryType } from "@/lib/constellation";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const { userId } = await requireProfile();

  const [entryRows, themeRows] = await Promise.all([
    db
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
      .limit(400),
    db
      .select({ label: themes.label, entryCount: themes.entryCount })
      .from(themes)
      .where(eq(themes.userId, userId)),
  ]);

  const bankEntries: BankEntry[] = entryRows.map((e) => ({
    id: e.id,
    type: e.type as EntryType,
    content: e.content,
    themes: e.themes ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  const bankThemes: BankTheme[] = themeRows.map((t) => ({
    label: t.label,
    entryCount: t.entryCount ?? 0,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <header className="pb-7">
        <p className="label-mono mb-3">The constellation of your mind</p>
        <h1 className="font-display text-4xl font-light tracking-tight text-marble sm:text-5xl">
          The bank
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-marble-dim text-pretty">
          Everything you&apos;ve thought out loud, kept. Each thought a star;
          the threads you return to draw the lines between them.
        </p>
      </header>

      <BankView entries={bankEntries} themes={bankThemes} />
    </div>
  );
}
