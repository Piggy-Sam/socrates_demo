// Pure helpers for the brain route (app/api/llm/chat/completions/route.ts).
// Keeps the route lean: user_id extraction, message sanitizing, query building,
// and a constant-time-ish bearer compare. No I/O here — see the route for that.

import { timingSafeEqual } from "node:crypto";
import type { ChatCompletionRequest, ChatMessage } from "./types";

/**
 * Constant-time-ish bearer compare. Guards against trivial timing leaks; falls
 * back to a length-mismatch-safe path (timingSafeEqual throws on unequal length).
 */
export function bearerMatches(
  presented: string | null | undefined,
  expected: string,
): boolean {
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still touch timingSafeEqual on equal-length dummy so length leak is the
    // only signal (length of a secret is not sensitive here).
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Pull the `Bearer <token>` value out of an Authorization header, or null. */
export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}

/**
 * Liberally dig a user_id out of an ElevenLabs Custom-LLM request body. The
 * agent threads it in via dynamic variables, and the exact nesting varies by
 * configuration, so we check every place it could plausibly land.
 */
export function extractUserId(
  body: ChatCompletionRequest,
): string | null {
  const candidates: unknown[] = [
    body.user_id,
    body.user,
    record(body.elevenlabs_extra_body)?.user_id,
    record(body.elevenlabs_extra_body)?.user,
    record(body.conversation_initiation_client_data)?.user_id,
    record(
      record(body.conversation_initiation_client_data)?.dynamic_variables,
    )?.user_id,
    record(body.dynamic_variables)?.user_id,
    record(body.metadata)?.user_id,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function record(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}

/**
 * Drop every system/developer message from incoming history. The identity is
 * prepended server-side and cannot be overridden by anything the caller sends.
 */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        m.role !== "system" &&
        m.role !== "developer" &&
        typeof m.content === "string" &&
        m.content.trim() !== "",
    )
    .map((m) => ({
      // OpenAI's chat API expects "assistant"; ElevenLabs/our UI may send that.
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
      ...(m.name ? { name: m.name } : {}),
    }));
}

/**
 * Build the RAG query from the last 1–3 user messages. Recent context is what
 * makes the callback open on a live thread and the memory moves possible.
 */
export function buildRagQuery(messages: ChatMessage[]): string {
  const userTexts = messages
    .filter((m) => m.role === "user" && typeof m.content === "string")
    .map((m) => (m.content as string).trim())
    .filter(Boolean);
  return userTexts.slice(-3).join("\n").slice(0, 2000);
}

/** A short id in the OpenAI `chatcmpl-...` style for chunk/completion ids. */
export function completionId(): string {
  return `chatcmpl-${cryptoRandom()}`;
}

function cryptoRandom(): string {
  // Avoid crypto import surface; route runtime is nodejs so this is plenty.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
  );
}
