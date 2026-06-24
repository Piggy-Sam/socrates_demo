// The shared brain response: identity + RAG + OpenAI streaming, in the
// OpenAI-compatible chat.completion wire format. Auth is resolved by the caller
// (the cookie/bearer route OR the path-secret voice route) and passed in, so both
// entry points share exactly one implementation.

import { env } from "@/lib/env";
import { openai } from "@/lib/openai";
import { getRagContext } from "@/lib/rag";
import { getStandingContext } from "@/lib/llm/context";
import { buildSystemPrompt } from "@/lib/socrates/system-prompt";
import type {
  ChatCompletion,
  ChatCompletionRequest,
  ChatMessage,
} from "@/lib/llm/types";
import {
  buildRagQuery,
  completionId,
  sanitizeMessages,
} from "@/lib/llm/brain";
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";

const enc = new TextEncoder();

// RAG race ceiling on the VOICE first-token path. The HNSW cosine index
// (entries_embedding_idx) makes embed + ANN scan typically sub-200ms, so 1200ms
// is ample headroom while roughly halving the worst-case dead air before Socrates
// speaks. On timeout the brain falls back gracefully to a RAG-less turn.
const VOICE_RAG_RACE_MS = 1200;
// Text chat has no live-call urgency; allow a generous budget for a cold DB.
const TEXT_RAG_RACE_MS = 8000;

// Standing context (recurring threads / latest distillation / open questions) is
// always-on memory fetched in parallel with RAG. Its own per-query timeouts live
// in lib/llm/context.ts; this is the outer ceiling for the whole fan-out so it can
// never outlast the turn's RAG budget. Voice stays tight; text can take longer.
const VOICE_STANDING_RACE_MS = 900;
const TEXT_STANDING_RACE_MS = 4000;

export function openaiError(
  message: string,
  status: number,
  type = "invalid_request_error",
): Response {
  return new Response(
    JSON.stringify({ error: { message, type, code: null, param: null } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

/** RAG continuity, but never let it stall the first token: resolve "" if the
 * lookup exceeds `ms` (cross-region DB + an embedding call can be slow). */
async function ragWithTimeout(
  userId: string,
  query: string,
  ms: number,
): Promise<string> {
  try {
    return await Promise.race([
      getRagContext(userId, query),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), ms)),
    ]);
  } catch {
    return "";
  }
}

/** Always-on standing memory, bounded by an outer race so a slow DB never stalls
 * the first token. getStandingContext is already failure-tolerant; this caps it. */
async function standingWithTimeout(
  userId: string,
  ms: number,
): Promise<string> {
  try {
    return await Promise.race([
      getStandingContext(userId, { budgetMs: ms }),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), ms)),
    ]);
  } catch {
    return "";
  }
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

/**
 * Build the system-prompted, RAG-grounded completion and stream OpenAI's SSE back
 * verbatim. `isVoiceCaller` selects the voice modality + a tighter RAG budget;
 * `userId` may be null for an anonymous (but authenticated) voice turn — RAG is
 * skipped in that case rather than failing.
 */
export async function respondAsBrain(
  body: ChatCompletionRequest,
  isVoiceCaller: boolean,
  userId: string | null,
): Promise<Response> {
  const modality: "voice" | "text" = isVoiceCaller ? "voice" : "text";
  const wantsStream = body.stream !== false; // default to streaming

  const history = sanitizeMessages(body.messages);
  const ragQuery = buildRagQuery(history);

  // Fetch turn-relevant RAG and always-on standing memory CONCURRENTLY, each under
  // its own race ceiling, so the two memory reads share wall-clock rather than
  // stacking it before the first token. Both gracefully resolve "" on timeout.
  const [ragContext, standingContext] = userId
    ? await Promise.all([
        ragQuery
          ? ragWithTimeout(
              userId,
              ragQuery,
              isVoiceCaller ? VOICE_RAG_RACE_MS : TEXT_RAG_RACE_MS,
            )
          : Promise.resolve(""),
        standingWithTimeout(
          userId,
          isVoiceCaller ? VOICE_STANDING_RACE_MS : TEXT_STANDING_RACE_MS,
        ),
      ])
    : ["", ""];

  const systemPrompt = buildSystemPrompt(modality, {
    ragContext,
    standingContext,
  });

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
      return openaiError("Upstream model error.", 500, "api_error");
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
        for await (const chunk of openaiStream as AsyncIterable<unknown>) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
      } catch (err) {
        console.error("[brain] streaming OpenAI error (mid)", err);
        const errChunk = {
          id: completionId(),
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" as const }],
        };
        controller.enqueue(enc.encode(`data: ${JSON.stringify(errChunk)}\n\n`));
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
