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
    return "Hey — it's your daily check-in. What's on your mind right now?";
  }
  return "Hey — what's on your mind right now?";
}

/** Compose the instruction for the model given kind + name + context. */
function buildInstruction(
  kind: OpenerKind,
  displayName: string,
  standingContext: string,
): string {
  const name = displayName.trim() || "there";
  const framing =
    kind === "daily"
      ? `This is the scheduled DAILY CHECK-IN — YOU placed the call, but still hand them the blank page: lead by asking what's on their mind right now, today. Don't ask how their day was.`
      : `They just opened the line, so hand them the blank page: lead by asking what's on their mind right now.`;

  return `You are Socrates, a thinking partner (a midwife of thought — their insight, not yours).
Write ONE spoken opening line to begin a conversation with this person. Constraints:
- 1–2 short sentences, spoken aloud on a call — plain, warm, low-key, genuinely curious. No markdown, no lists, no emoji, no stage directions.
- No flattery, no grading them, no metrics/streaks, no "how was your day".
- ${framing}
- LEAD with the present: open by asking what's on their mind / what they want to think through right NOW — a fresh, blank canvas. This is the most important rule: do NOT open by proposing to continue an old topic.
- Then, ONLY as a light secondary option, you MAY offer to circle back to ONE specific recent thread from their own notes below IF they don't have something new — phrased as a fallback, not the lead. (e.g. "What's on your mind? Or if nothing's pressing, we could pick up where you left off on X.") Keep the circle-back to a brief clause at the end; never make it the main question.
- If the notes are thin or empty, just ask what's on their mind and invite them in — no invented specifics, no circle-back.
- You may use their name (${name}) lightly, but don't force it.

THEIR RECENT THINKING (their own material — only for the optional circle-back clause; never quote verbatim, never interpret it for them):
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
