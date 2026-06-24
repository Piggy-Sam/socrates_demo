// The personalized first message — Socrates' opening line, generated fresh per
// conversation from the person's own standing context. It replaces the fixed
// dashboard greeting: a warm, plain, curious open on a LIVE thread, ending in an
// inviting question. For the daily check-in it is proactive — tied to where the
// person actually left off.
//
// This is a control-plane call made at INITIATION (token mint / outbound dial /
// cron), not on the per-turn hot path, so a short OpenAI call is affordable. It is
// guarded by a tight timeout and ALWAYS returns a safe, non-empty fallback so it
// can never block a call from starting.

import { openai } from "@/lib/openai";
import { env } from "@/lib/env";
import { getStandingContext } from "@/lib/llm/context";

export type OpenerKind = "voice" | "call" | "daily";

// Hard ceiling on the whole opener (context fetch + model call). If we blow it,
// the caller proceeds with the fallback — a personalized open is a nice-to-have,
// never a blocker for the conversation starting.
const OPENER_BUDGET_MS = 3500;
// The standing-context read gets a slice of the budget; the model call gets the rest.
const OPENER_CONTEXT_MS = 1200;
// Keep it spoken-short; a few sentences at most.
const OPENER_MAX_TOKENS = 120;

/** Safe, non-empty fallback when there's no context or anything fails. */
function fallbackOpener(kind: OpenerKind): string {
  if (kind === "daily") {
    return "Hey — it's your daily check-in. What's been turning over in your mind since we last talked?";
  }
  return "Hey — start wherever you are. What's been turning over in your mind?";
}

/** Compose the instruction for the model given kind + name + context. */
function buildInstruction(
  kind: OpenerKind,
  displayName: string,
  standingContext: string,
): string {
  const name = displayName.trim() || "there";
  const proactive =
    kind === "daily"
      ? `This is the scheduled DAILY CHECK-IN call — YOU initiated it, so be proactive: tie the opener to where they actually left off ("Last night you left X unresolved — where did it land?", "You'd been circling Y — has it moved?"). Don't ask how their day was.`
      : `This opens a conversation they just started, so meet them where they are: open on a live thread from their recent notes, not a blank greeting.`;

  return `You are Socrates, a thinking partner (a midwife of thought — their insight, not yours).
Write ONE spoken opening line to begin a conversation with this person. Constraints:
- 1–2 short sentences, spoken aloud on a call — plain, warm, low-key, genuinely curious. No markdown, no lists, no emoji, no stage directions.
- No flattery, no grading them, no metrics/streaks, no "how was your day".
- Reference a LIVE thread from THEIR OWN recent notes below — something specific they were actually thinking about — and end with one inviting, open question that hands the thread back to them.
- If the notes are thin or empty, open simply and invite them in without inventing specifics.
- You may use their name (${name}) lightly, but don't force it.
${proactive}

THEIR RECENT THINKING (their own material — use for continuity, never quote verbatim, never interpret it for them):
${standingContext || "(no recent notes available)"}

Return ONLY the opening line itself, nothing else.`;
}

/** Race a promise against a timeout, resolving the fallback if it's too slow. */
function withDeadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Generate a personalized opener for a user. Reuses the shared standing context,
 * makes one quick model call, and ALWAYS resolves to a non-empty string — the
 * safe fallback on any error, empty context, or timeout. `displayName` may be
 * passed by the caller (it usually already has the profile) to skip a lookup.
 */
export async function generateOpener(
  userId: string,
  kind: OpenerKind,
  displayName = "there",
): Promise<string> {
  const fallback = fallbackOpener(kind);

  const run = async (): Promise<string> => {
    const standingContext = await withDeadline(
      getStandingContext(userId, { budgetMs: OPENER_CONTEXT_MS }),
      OPENER_CONTEXT_MS,
      "",
    );
    // With no material at all, the model would only invent — prefer the honest
    // fallback (which already invites them in) over a fabricated "live thread".
    if (!standingContext.trim()) return fallback;

    const instruction = buildInstruction(kind, displayName, standingContext);
    const completion = await openai().chat.completions.create({
      model: env.openaiModel(),
      temperature: 0.8,
      max_tokens: OPENER_MAX_TOKENS,
      messages: [{ role: "user", content: instruction }],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return fallback;
    // Strip wrapping quotes a model sometimes adds; collapse to one clean line.
    const cleaned = text
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || fallback;
  };

  try {
    return await withDeadline(run(), OPENER_BUDGET_MS, fallback);
  } catch {
    return fallback;
  }
}
