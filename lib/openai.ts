import OpenAI from "openai";
import { env } from "./env";

let _client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: env.openaiKey() });
  return _client;
}

/** Embed a single string with the configured embedding model (1536 dims). */
export async function embed(input: string): Promise<number[]> {
  const res = await openai().embeddings.create({
    model: env.embeddingModel(),
    input: input.replace(/\n/g, " ").slice(0, 8000),
  });
  return res.data[0].embedding;
}

/** Embed many strings in one request (order preserved). */
export async function embedMany(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const res = await openai().embeddings.create({
    model: env.embeddingModel(),
    input: inputs.map((i) => i.replace(/\n/g, " ").slice(0, 8000)),
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
