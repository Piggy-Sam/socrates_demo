// Bank export — the thinking stays yours. Authenticated; streams ALL of the
// CURRENT user's entries (and their recurring themes) as ONE document so a
// person can take their bank with them. Ownership is enforced server-side:
// rows are scoped to the signed-in user, never anyone else's.
//
// Default is markdown (a readable commonplace ledger, grouped by day);
// ?format=json returns the same data structured, for true portability.

import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { entries, themes } from "@/lib/db/schema";

export const runtime = "nodejs";

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** UTC calendar-day key (YYYY-MM-DD) for grouping. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // The user's whole bank, oldest first so the document reads as a ledger in
  // time. Scoped to user.id — ownership enforced here, server-side, always.
  const rows = await db
    .select({
      id: entries.id,
      type: entries.type,
      content: entries.content,
      themes: entries.themes,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .where(eq(entries.userId, user.id))
    .orderBy(asc(entries.createdAt));

  const themeRows = await db
    .select({
      label: themes.label,
      description: themes.description,
      firstSeen: themes.firstSeen,
      lastSeen: themes.lastSeen,
    })
    .from(themes)
    .where(eq(themes.userId, user.id))
    .orderBy(desc(themes.lastSeen));

  const format = new URL(req.url).searchParams.get("format");

  if (format === "json") {
    const payload = {
      exportedAt: new Date().toISOString(),
      entries: rows.map((e) => ({
        id: e.id,
        type: e.type,
        content: e.content,
        themes: e.themes ?? [],
        createdAt: e.createdAt.toISOString(),
      })),
      themes: themeRows.map((t) => ({
        label: t.label,
        description: t.description ?? null,
        firstSeen: t.firstSeen?.toISOString() ?? null,
        lastSeen: t.lastSeen?.toISOString() ?? null,
      })),
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="socrates-bank.json"',
        "Cache-Control": "no-store",
      },
    });
  }

  const md = buildMarkdown(rows, themeRows);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="socrates-bank.md"',
      "Cache-Control": "no-store",
    },
  });
}

type EntryRow = {
  id: string;
  type: string;
  content: string;
  themes: string[] | null;
  createdAt: Date;
};

type ThemeRow = {
  label: string;
  description: string | null;
  firstSeen: Date | null;
  lastSeen: Date | null;
};

/** The bank as one markdown document — a ledger grouped by day, themes appended. */
function buildMarkdown(rows: EntryRow[], themeRows: ThemeRow[]): string {
  const out: string[] = [];
  out.push("# Your bank");
  out.push("");
  out.push("_Your thinking is yours to take._");
  out.push("");
  out.push(`Exported ${DAY_FMT.format(new Date())} (UTC).`);
  out.push("");

  if (rows.length === 0) {
    out.push("Nothing gathered yet.");
    out.push("");
  } else {
    let currentDay = "";
    for (const e of rows) {
      const key = dayKey(e.createdAt);
      if (key !== currentDay) {
        currentDay = key;
        out.push("");
        out.push(`## ${DAY_FMT.format(e.createdAt)}`);
        out.push("");
      }
      const time = TIME_FMT.format(e.createdAt);
      out.push(`**${time} · ${e.type}**`);
      out.push("");
      out.push(e.content.trim());
      const t = e.themes ?? [];
      if (t.length > 0) {
        out.push("");
        out.push(`_Themes: ${t.join(", ")}_`);
      }
      out.push("");
    }
  }

  if (themeRows.length > 0) {
    out.push("");
    out.push("## Recurring threads");
    out.push("");
    for (const t of themeRows) {
      out.push(
        t.description
          ? `- **${t.label}** — ${t.description.trim()}`
          : `- **${t.label}**`,
      );
    }
    out.push("");
  }

  return out.join("\n");
}
