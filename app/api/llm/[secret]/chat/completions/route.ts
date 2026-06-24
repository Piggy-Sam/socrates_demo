// Path-authenticated voice brain. ElevenLabs' Custom LLM does NOT reliably
// forward request headers, so instead of a Bearer header the voice agent's Server
// URL embeds the shared secret in the path:
//   https://<host>/api/llm/<ELEVENLABS_LLM_SECRET>
// ElevenLabs appends "/chat/completions", landing here. We constant-time check
// the path secret, treat the caller as a trusted voice caller, and run the exact
// same brain as the cookie/bearer route. (Next routes the static
// /api/llm/chat/completions to the text route; only a non-"chat" first segment
// reaches this dynamic route.)

import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { ChatCompletionRequest } from "@/lib/llm/types";
import { bearerMatches, extractUserId } from "@/lib/llm/brain";
import { openaiError, respondAsBrain } from "@/lib/llm/respond";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ secret: string }> },
): Promise<Response> {
  const { secret } = await ctx.params;

  let expected: string | null = null;
  try {
    expected = env.elevenLabsLlmSecret();
  } catch {
    expected = null;
  }
  if (!expected || !bearerMatches(secret, expected)) {
    return openaiError("Unauthorized.", 401);
  }

  let body: ChatCompletionRequest;
  try {
    body = (await req.json()) as ChatCompletionRequest;
  } catch {
    return openaiError("Invalid JSON body.", 400);
  }
  if (!body || !Array.isArray(body.messages)) {
    return openaiError("`messages` must be an array.", 400);
  }

  // The path secret authenticates a trusted voice caller. user_id is read from
  // the body if present; absent is fine (respondAsBrain just skips RAG).
  return respondAsBrain(body, true, extractUserId(body));
}
