// Shared types for the post-call distillation pipeline — turning a transcript
// into the atomic bank (entries), recurring threads (themes), and a restrained
// daily summary in Socrates' voice. See SPEC §5 (data model) and §6 (webhook).

import type { EntryType } from "@/lib/constellation";

/** One atomic thought lifted from a session — a future star in the sky. */
export type ExtractedEntry = {
  type: EntryType;
  /** The person's own thought, surfaced in their words (never interpreted). */
  content: string;
  /** Lowercase, short thematic tags that link this thread across time. */
  themes: string[];
};

/** The single structured result of one extraction call: entries + a summary. */
export type Distillation = {
  entries: ExtractedEntry[];
  /** Short markdown daily summary in Socrates' restrained voice (no praise). */
  summary: string;
};

/** A transcript turn in the canonical shape the pipeline reasons over. */
export type TranscriptTurn = {
  role: "user" | "socrates";
  content: string;
};

/** What the extraction pipeline persisted, returned for logging/callers. */
export type ExtractAndStoreResult = {
  sessionId: string;
  entriesInserted: number;
  themesTouched: number;
  summaryId: string | null;
  distillation: Distillation;
};
