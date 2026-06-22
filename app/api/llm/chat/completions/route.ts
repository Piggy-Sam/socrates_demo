// THE BRAIN — an OpenAI-compatible Chat Completions shim. One mind, two surfaces:
// ElevenLabs' Custom LLM (voice) and the in-app text chat both POST here. This is
// the chokepoint where the never-yielding Socratic identity is enforced: the system
// prompt is ALWAYS prepended server-side and cannot be overridden by message history.
//
// Auth (dual):
//   (a) Authorization: Bearer <ELEVENLABS_LLM_SECRET>  -> trusted voice caller;
//       user_id comes from the agent's dynamic variables in the body.
//   (b) else the in-app Supabase cookie session -> user_id = user.id (text chat).
//   (c) else 401.
//
// We DROP incoming system/developer messages, build RAG continuity from the last
// user turns, prepend buildSystemPrompt(modality, rag), then stream OpenAI's SSE
// straight back in the chat.completion.chunk wire format. Model + temperature are
// chosen in code (we never forward an empty/incoming model id).

import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { openai } from "@/lib/openai";
import { getRagContext } from "@/lib/rag";
import { buildSystemPrompt } from "@/lib/socrates/system-prompt";
import { createClient } from "@/lib/supabase/server";
import type {
  ChatCompletion,
  ChatCompletionRequest,
  ChatMessage,
} from "@/lib/llm/types";
import {
  bearerMatches,
  buildRagQuery,
  completionId,
  extractBearer,
  extractUserId,
  sanitizeMessages,
} from "@/lib/llm/brain";
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";

export const runtime = "nodejs";
export const maxDuration = 60;

const enc = new TextEncoder();

function openaiError(
  message: string,
  status: number,
  type = "invalid_request_error",
): Response {
  return new Response(
    JSON.stringify({ error: { message, type, code: null, param: null } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  // ── parse body ────────────────────────────────────────────────────────────
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
    // (b) in-app cookie session
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

  // The bearer path that fails to yield a user_id is a misconfigured agent; the
  // cookie path with no user is unauthenticated. Both are 401.
  if (!userId) {
    return openaiError(
      isVoiceCaller
        ? "Missing user_id in dynamic variables."
        : "Unauthorized.",
      401,
      "invalid_request_error",
    );
  }

  const modality: "voice" | "text" = isVoiceCaller ? "voice" : "text";
  const wantsStream = body.stream !== false; // default to streaming

  // ── identity + RAG ──────────────────────────────────────────────────────────
  const history = sanitizeMessages(body.messages);
  const ragQuery = buildRagQuery(history);
  // RAG is best-effort; getRagContext already returns "" on failure.
  const ragContext = ragQuery ? await getRagContext(userId, ragQuery) : "";
  const systemPrompt = buildSystemPrompt(modality, ragContext);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map(toOpenAiMessage),
  ];

  const model = env.openaiModel(); // NEVER forward the incoming/empty model id

  // ── non-streaming fallback (stream:false) ────────────────────────────────────
  if (!wantsStream) {
    try {
      const completion = await openai().chat.completions.create({
        model,
        temperature: 0.8,
        messages,
        stream: false,
      });
      const choice = completion.choices[0];
      const out: ChatCompletion = {
        id: completion.id ?? completionId(),
        object: "chat.completion",
        created: completion.created ?? Math.floor(Date.now() / 1000),
        model: completion.model ?? model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: choice?.message?.content ?? "",
            },
            finish_reason:
              (choice?.finish_reason as ChatCompletion["choices"][number]["finish_reason"]) ??
              "stop",
          },
        ],
        usage: completion.usage
          ? {
              prompt_tokens: completion.usage.prompt_tokens,
              completion_tokens: completion.usage.completion_tokens,
              total_tokens: completion.usage.total_tokens,
            }
          : undefined,
      };
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[brain] non-streaming OpenAI error", err);
      return openaiError(
        "Upstream model error.",
        500,
        "api_error",
      );
    }
  }

  // ── streaming: relay OpenAI SSE straight back as chat.completion.chunk ────────
  const params: ChatCompletionCreateParamsStreaming = {
    model,
    temperature: 0.8,
    messages,
    stream: true,
  };

  let openaiStream: Awaited<
    ReturnType<ReturnType<typeof openai>["chat"]["completions"]["create"]>
  >;
  try {
    openaiStream = await openai().chat.completions.create(params);
  } catch (err) {
    console.error("[brain] streaming OpenAI error (open)", err);
    return openaiError("Upstream model error.", 500, "api_error");
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // openaiStream is an async-iterable of chat.completion.chunk objects;
        // re-emit each one verbatim so first token gets out with no buffering.
        for await (const chunk of openaiStream as AsyncIterable<unknown>) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
      } catch (err) {
        console.error("[brain] streaming OpenAI error (mid)", err);
        // Emit a terminal chunk so the consumer can finish cleanly.
        const errChunk = {
          id: completionId(),
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            { index: 0, delta: {}, finish_reason: "stop" as const },
          ],
        };
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify(errChunk)}\n\n`),
        );
      } finally {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable proxy buffering — first token fast
    },
  });
}

/** Map our wire ChatMessage to an OpenAI message param. */
function toOpenAiMessage(m: ChatMessage): ChatCompletionMessageParam {
  const content = m.content ?? "";
  switch (m.role) {
    case "user":
      return { role: "user", content };
    case "assistant":
      return { role: "assistant", content };
    case "tool":
      // No tools in this brain — treat any stray tool message as user context.
      return { role: "user", content };
    default:
      return { role: "user", content };
  }
}
