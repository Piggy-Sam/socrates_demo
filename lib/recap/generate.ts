// Shared weekly-recap synthesis. Gathers a user's entries within a period and
// makes ONE OpenAI call to write a reflective recap in Socrates' restrained,
// non-appraising voice — surface recurring threads and tensions, hand meaning
// back to the person. NEVER verdicts, praise, or metrics.
//
// Both /api/recap/generate (the latest week) and /api/recap/regenerate (an
// arbitrary viewed week) run THROUGH here so the prompt and call never drift.

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { openai } from "@/lib/openai";

/** Start of the default recap window: 7 days ago, at midnight UTC. */
export function weekStart(now: Date): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const RECAP_SYSTEM = `You are Socrates writing a private weekly reflection back to the person whose thoughts these are. You are a midwife of thought, never an assistant or an appraiser.

Write a short, warm, unhurried letter — second person ("you"), reverent toward their words. Surface the recurring threads and the live tensions you notice across the week; quote or paraphrase their own phrasing where it lands. When you name a pattern, HOLD IT UP and hand the meaning back to them — "here's a pattern; what do you make of it?" — never "here's what this means about you."

Hard rules:
- NO praise, no flattery, no verdicts, no advice unless none is given here (give none).
- NO metrics, counts, streaks, scores, or "you logged N entries". Never gamify.
- You are spare. End with one or two open questions that return them to themselves, not a summary.
- Plain markdown only: short paragraphs, occasional emphasis. No headings, no bullet lists of "achievements".`;

/** The result of a recap synthesis attempt. */
export type RecapResult =
  | { ok: true; content: string }
  | { ok: false; status: number; error: string };

/**
 * Gather the user's entries within [start, end] and synthesize a recap.
 * Returns a discriminated result so callers can map it onto an HTTP response
 * without re-implementing the prompt or the OpenAI call.
 */
export async function generateRecap(
  userId: string,
  start: Date,
  end: Date,
): Promise<RecapResult> {
  const weekEntries = await db
    .select({
      type: entries.type,
      content: entries.content,
      themes: entries.themes,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        gte(entries.createdAt, start),
        lte(entries.createdAt, end),
      ),
    )
    .orderBy(desc(entries.createdAt))
    .limit(120);

  if (weekEntries.length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        "There's nothing from this week yet. Talk something through first, then there's something to reflect on.",
    };
  }

  const corpus = weekEntries
    .map((e) => {
      const themes = e.themes?.length ? ` [${e.themes.join(", ")}]` : "";
      return `- (${e.type})${themes} ${e.content}`;
    })
    .join("\n");

  let content: string;
  try {
    const completion = await openai().chat.completions.create({
      model: env.openaiModel(),
      temperature: 0.8,
      messages: [
        { role: "system", content: RECAP_SYSTEM },
        {
          role: "user",
          content: `Here are the thoughts I put down this week (most recent first). Write the reflection back to me.\n\n${corpus}`,
        },
      ],
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[recap/generate] OpenAI failed", err);
    return {
      ok: false,
      status: 502,
      error: "Couldn't gather the week just now. Try again.",
    };
  }

  if (!content) {
    return {
      ok: false,
      status: 502,
      error: "Couldn't gather the week just now. Try again.",
    };
  }

  return { ok: true, content };
}
