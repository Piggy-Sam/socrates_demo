// ElevenLabs REST helpers for outbound PSTN calls (Twilio imported into
// ElevenLabs). The agent places a real phone call; the Custom-LLM brain
// (/api/llm/chat/completions) and the post-call webhook do the rest.
//
// IMPORTANT ENV FLAG — see blockers:
//   `agent_phone_number_id` MUST be the ElevenLabs phone-number id ("phnum_...")
//   from the ElevenLabs dashboard, NOT a raw E.164 number. The env var
//   ELEVENLABS_PHONE_NUMBER_ID currently appears to hold a raw number ("+1984...").
//   If outbound calls fail, that env value is the first thing to fix.
//   Also: Twilio TRIAL only dials *verified* numbers and plays a short Twilio
//   greeting before Socrates speaks — fine for demoing to your own verified phone.

import { env } from "@/lib/env";

const ELEVENLABS_BASE = "https://api.elevenlabs.io";

/**
 * Dynamic variables handed to the agent at call start. They become
 * `{{user_id}}`, `{{display_name}}`, `{{recent_thread}}` inside the agent's
 * prompt/first message, and `user_id` is what the brain route reads to scope RAG.
 * Values must be primitives (string/number/boolean) per the ElevenLabs schema.
 */
export type CallDynamicVariables = {
  user_id: string;
  display_name: string;
  /** A one-line continuity hook from the user's most recent thought, for the callback open. */
  recent_thread: string;
  [key: string]: string | number | boolean;
};

export type StartOutboundCallArgs = {
  /** E.164 destination, e.g. "+14155550123". For Twilio trial it must be verified. */
  toNumber: string;
  dynamicVariables: CallDynamicVariables;
};

/** Shape returned by POST /v1/convai/twilio/outbound-call. */
export type OutboundCallResult = {
  success: boolean;
  message: string | null;
  conversationId: string | null;
  callSid: string | null;
};

/**
 * Place an outbound call via ElevenLabs + Twilio. Throws a descriptive Error
 * on transport/HTTP failure; resolves with the (possibly success:false) body
 * on a 200 so callers can surface a calm message.
 */
export async function startOutboundCall({
  toNumber,
  dynamicVariables,
}: StartOutboundCallArgs): Promise<OutboundCallResult> {
  const number = toNumber?.trim();
  if (!number) throw new Error("startOutboundCall: missing destination number");

  const body = {
    agent_id: env.elevenLabsAgentId(),
    // NOTE: must be the ElevenLabs "phnum_..." id, not a raw phone number.
    agent_phone_number_id: env.elevenLabsPhoneNumberId(),
    to_number: number,
    conversation_initiation_client_data: {
      // top-level user_id is convenient; we also mirror it into dynamic_variables
      // so it is available to the prompt and to the brain route's RAG scoping.
      user_id: dynamicVariables.user_id,
      dynamic_variables: dynamicVariables,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${ELEVENLABS_BASE}/v1/convai/twilio/outbound-call`, {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // outbound-call is a quick control-plane request; don't hang the function
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(
      `ElevenLabs outbound-call request failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(
      `ElevenLabs outbound-call ${res.status} ${res.statusText}: ${raw.slice(0, 500)}`,
    );
  }

  let parsed: {
    success?: boolean;
    message?: string;
    conversation_id?: string;
    callSid?: string;
  };
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `ElevenLabs outbound-call returned non-JSON: ${raw.slice(0, 300)}`,
    );
  }

  return {
    success: parsed.success ?? true,
    message: parsed.message ?? null,
    conversationId: parsed.conversation_id ?? null,
    callSid: parsed.callSid ?? null,
  };
}

/**
 * Fetch a conversation by id (handy for inspecting a placed call after the fact).
 * Best-effort: returns null on any failure rather than throwing.
 */
export async function getConversation(
  conversationId: string,
): Promise<unknown | null> {
  try {
    const res = await fetch(
      `${ELEVENLABS_BASE}/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      {
        headers: { "xi-api-key": env.elevenLabsKey() },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}
