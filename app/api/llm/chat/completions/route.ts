// THE BRAIN — an OpenAI-compatible Chat Completions shim. One mind, several
// surfaces: the in-app text chat (cookie auth) and the ElevenLabs Custom LLM
// (voice). This is the chokepoint where the never-yielding Socratic identity is
// enforced; the actual completion logic lives in lib/llm/respond.ts and is shared
// with the path-authenticated voice route (app/api/llm/[secret]/chat/completions).
//
// Auth here (dual):
//   (a) Authorization: Bearer <ELEVENLABS_LLM_SECRET>  -> trusted voice caller.
//   (b) else the in-app Supabase cookie session         -> user_id = user.id.
//   (c) else 401.
// NOTE: ElevenLabs does NOT reliably forward request headers to a custom LLM, so
// the voice agent authenticates via the URL-path secret route instead; this bearer
// path is kept for the in-app and any header-capable caller.

import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ChatCompletionRequest } from "@/lib/llm/types";
import { bearerMatches, extractBearer, extractUserId } from "@/lib/llm/brain";
import { openaiError, respondAsBrain } from "@/lib/llm/respond";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  let body: ChatCompletionRequest;
  try {
    body = (await req.json()) as ChatCompletionRequest;
  } catch {
    return openaiError("Invalid JSON body.", 400);
  }
  if (!body || !Array.isArray(body.messages)) {
    return openaiError("`messages` must be an array.", 400);
  }

  // ── dual auth ─────────────────────────────────────────────────────────────
  const presented = extractBearer(req.headers.get("authorization"));
  let isVoiceCaller = false;
  let userId: string | null = null;

  if (presented) {
    let secret: string | null = null;
    try {
      secret = env.elevenLabsLlmSecret();
    } catch {
      secret = null;
    }
    if (secret && bearerMatches(presented, secret)) {
      isVoiceCaller = true;
      userId = extractUserId(body);
    }
  }

  if (!isVoiceCaller) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // fall through to 401 below
    }
  }

  // A trusted voice caller still gets a response when user_id is absent (no RAG
  // that turn); only the cookie path with no user is unauthenticated.
  if (!userId && !isVoiceCaller) {
    return openaiError("Unauthorized.", 401);
  }

  return respondAsBrain(body, isVoiceCaller, userId);
}
