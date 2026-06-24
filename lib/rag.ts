// RAG over the bank — what makes the callback open and the memory moves work.
// Embed the recent context, vector-search the user's prior entries, and return
// a continuity block to inject into the system prompt.

import { and, asc, cosineDistance, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { embed } from "@/lib/openai";

export type RagEntry = {
  id: string;
  content: string;
  type: string;
  themes: string[] | null;
  createdAt: Date;
  similarity: number;
};

/**
 * Top-k prior entries most relevant to `queryText`, scoped to one user.
 * Returns [] on any failure (RAG is best-effort; never block a live turn).
 */
export async function searchEntries(
  userId: string,
  queryText: string,
  k = 6,
  minSimilarity = 0.18,
): Promise<RagEntry[]> {
  if (!queryText.trim()) return [];
  try {
    const qv = await embed(queryText);
    // Order by the RAW cosine-distance operator (ascending) so the Postgres
    // planner can use the HNSW ANN index (entries_embedding_idx / vector_cosine_ops).
    // Wrapping the distance in arithmetic (e.g. `1 - dist`) hides the operator from
    // the planner and forces a sequential scan, so keep distance bare in ORDER BY.
    const distance = cosineDistance(entries.embedding, qv);
    const similarity = sql<number>`1 - (${distance})`;
    return await db
      .select({
        id: entries.id,
        content: entries.content,
        type: entries.type,
        themes: entries.themes,
        createdAt: entries.createdAt,
        similarity,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          gt(similarity, minSimilarity),
        ),
      )
      .orderBy(asc(distance))
      .limit(k);
  } catch (err) {
    console.error("[rag] searchEntries failed", err);
    return [];
  }
}

/** Format relevant entries as a continuity block for the system prompt. */
export async function getRagContext(
  userId: string,
  queryText: string,
  k = 6,
): Promise<string> {
  const rows = await searchEntries(userId, queryText, k);
  if (rows.length === 0) return "";
  return rows
    .map((r) => {
      const themes = r.themes?.length ? ` [${r.themes.join(", ")}]` : "";
      return `- (${r.type})${themes} ${r.content}`;
    })
    .join("\n");
}
