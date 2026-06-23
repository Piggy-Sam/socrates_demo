// ElevenLabs REST helpers for outbound PSTN calls (Twilio imported into
// ElevenLabs). The agent places a real phone call; the Custom-LLM brain
// (/api/llm/chat/completions) and the post-call webhook do the rest.
//
// ENV NOTE:
//   ELEVENLABS_PHONE_NUMBER_ID should be the ElevenLabs phone-number id
//   ("phnum_..."), NOT a raw E.164 number. If it's missing or a raw number,
//   startOutboundCall() self-heals by resolving the account's outbound number id
//   at call time (configuredPhoneNumberId / lookupOutboundPhoneNumberId), and
//   also retries once if a configured id 404s.
//   Note: Twilio TRIAL only dials *verified* numbers and plays a short Twilio
//   greeting before Socrates speaks — fine for demoing to your own verified phone.

import { env } from "@/lib/env";

const ELEVENLABS_BASE = "https://api.elevenlabs.io";

const PHNUM_RE = /^phnum_/;

/**
 * The configured phone-number id — but ONLY if it looks like a real ElevenLabs
 * id (`phnum_…`). A raw E.164 number (a common misconfiguration) or an empty
 * value is treated as "unset" so we fall back to resolving the id from the
 * account, instead of sending Twilio garbage and 404ing.
 */
function configuredPhoneNumberId(): string | null {
  try {
    const v = env.elevenLabsPhoneNumberId()?.trim();
    return v && PHNUM_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** First outbound-capable phone-number id registered on the ElevenLabs account. */
async function lookupOutboundPhoneNumberId(): Promise<string | null> {
  try {
    const res = await fetch(`${ELEVENLABS_BASE}/v1/convai/phone-numbers`, {
      headers: { "xi-api-key": env.elevenLabsKey() },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{
      phone_number_id?: string;
      supports_outbound?: boolean;
    }>;
    if (!Array.isArray(list)) return null;
    const pick =
      list.find((p) => p.supports_outbound && p.phone_number_id) ??
      list.find((p) => p.phone_number_id);
    return pick?.phone_number_id ?? null;
  } catch {
    return null;
  }
}

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

  // Resolve the phone-number id: prefer a correctly-formatted configured value;
  // otherwise (missing, or a raw E.164 number set by mistake) look it up from
  // the account so the call still goes through.
  let phoneNumberId = configuredPhoneNumberId();
  let usedLookup = false;
  if (!phoneNumberId) {
    phoneNumberId = await lookupOutboundPhoneNumberId();
    usedLookup = true;
  }
  if (!phoneNumberId) {
    throw new Error(
      "No ElevenLabs phone number available — set ELEVENLABS_PHONE_NUMBER_ID to a phnum_… id, or register an outbound number in ElevenLabs.",
    );
  }

  const send = (phnumId: string): Promise<Response> =>
    fetch(`${ELEVENLABS_BASE}/v1/convai/twilio/outbound-call`, {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: env.elevenLabsAgentId(),
        agent_phone_number_id: phnumId,
        to_number: number,
        conversation_initiation_client_data: {
          // top-level user_id is convenient; we also mirror it into
          // dynamic_variables for the prompt and the brain route's RAG scoping.
          user_id: dynamicVariables.user_id,
          dynamic_variables: dynamicVariables,
        },
      }),
      // outbound-call is a quick control-plane request; don't hang the function
      signal: AbortSignal.timeout(15_000),
    });

  let res: Response;
  try {
    res = await send(phoneNumberId);
    // Self-heal a stale/unknown configured id: if it 404s, resolve the real one
    // from the account and retry once.
    if (res.status === 404 && !usedLookup) {
      const looked = await lookupOutboundPhoneNumberId();
      if (looked && looked !== phoneNumberId) {
        console.warn(
          `[elevenlabs] phone_number_id ${phoneNumberId} not found; retrying with ${looked}`,
        );
        res = await send(looked);
      }
    }
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
