// Typed, lazy env access. We read process.env at call time (not import time) so
// the build never fails for a missing secret; routes that need a value assert it.

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  appUrl: () =>
    (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    ),

  // Supabase (new key scheme)
  supabaseUrl: () => req("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: () => req("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: () => req("SUPABASE_SECRET_KEY"),

  // Postgres
  databaseUrl: () => req("DATABASE_URL"), // pooled, runtime (pgbouncer)
  directUrl: () => req("DIRECT_URL"), // direct, migrations

  // OpenAI
  openaiKey: () => req("OPENAI_API_KEY"),
  openaiModel: () => process.env.OPENAI_MODEL || "gpt-4o",
  embeddingModel: () =>
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",

  // ElevenLabs
  elevenLabsKey: () => req("ELEVENLABS_API_KEY"),
  elevenLabsAgentId: () => req("NEXT_PUBLIC_ELEVENLABS_AGENT_ID"),
  elevenLabsPhoneNumberId: () => req("ELEVENLABS_PHONE_NUMBER_ID"),
  elevenLabsWebhookSecret: () => req("ELEVENLABS_WEBHOOK_SECRET"),
  elevenLabsLlmSecret: () => req("ELEVENLABS_LLM_SECRET"),

  cronSecret: () => req("CRON_SECRET"),
} as const;

// public values are inlined by Next at build; safe to read directly client-side
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, ""),
};
