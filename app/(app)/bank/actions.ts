"use server";

// Bank actions, callable from the client. The bank's list search escalates from
// the instant substring filter (type-ahead) to semantic recall on submit: it
// reuses the same vector search that powers RAG (lib/rag.ts), so "search by
// meaning" finds thoughts that share a sense, not just a string. Scoped to the
// signed-in user; returns ranked entry ids only (the client already holds the
// entry bodies). Best-effort — searchEntries returns [] on any failure.

import { getCurrentUser } from "@/lib/auth";
import { searchEntries } from "@/lib/rag";

/** Ranked entry ids for `query`, by meaning, newest-relevant first. */
export async function searchBankByMeaning(query: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (!query.trim()) return [];

  const rows = await searchEntries(user.id, query, 24);
  return rows.map((r) => r.id);
}
