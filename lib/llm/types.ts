// The brain contract — the OpenAI Chat Completions wire format that ElevenLabs'
// Custom LLM and the text-chat UI both speak to POST /api/llm/chat/completions.
// Keep this aligned with the OpenAI spec; the route is an OpenAI-compatible shim.

export type ChatRole = "system" | "user" | "assistant" | "tool" | "developer";

export type ChatMessage = {
  role: ChatRole;
  content: string | null;
  name?: string;
};

/**
 * Incoming request. ElevenLabs sends NO model id (we choose it in code) and is
 * configured not to send temperature (we set it in code). `user_id` is threaded
 * in via the agent's dynamic variables; we accept it at the top level or nested.
 */
export type ChatCompletionRequest = {
  messages: ChatMessage[];
  model?: string; // ignored — never forwarded empty; we use env OPENAI_MODEL
  stream?: boolean;
  temperature?: number; // ignored — set in code
  user?: string;
  user_id?: string; // dynamic variable from the agent
  // ElevenLabs may attach extra fields (e.g. elevenlabs_extra_body); tolerate them
  [key: string]: unknown;
};

// ── Streaming SSE response shapes (OpenAI `chat.completion.chunk`) ──────────────
export type ChatCompletionChunkChoice = {
  index: number;
  delta: { role?: ChatRole; content?: string };
  finish_reason: "stop" | "length" | "content_filter" | null;
};

export type ChatCompletionChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
};

// ── Non-streaming response (fallback when stream=false) ────────────────────────
export type ChatCompletion = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: "stop" | "length" | "content_filter";
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
