// The data contract — the bank. Drizzle schema for Supabase Postgres + pgvector.
// All user-scoped tables are RLS-protected (policies live in the SQL migration);
// the server pipeline writes via the secret key, bypassing RLS. See SPEC §5/§11.

import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// ── enums ──────────────────────────────────────────────────────────────────────
export const sessionType = pgEnum("session_type", [
  "scheduled_call",
  "on_demand_voice",
  "chat",
]);

export const messageRole = pgEnum("message_role", ["user", "socrates"]);

export const entryType = pgEnum("entry_type", [
  "idea",
  "opinion",
  "feeling",
  "observation",
  "question",
  "decision",
]);

export const summaryKind = pgEnum("summary_kind", ["daily", "weekly"]);

export const patternKind = pgEnum("pattern_kind", [
  "recurring",
  "contradiction",
  "abandoned",
]);

// ── profiles (id = auth.users.id) ───────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = supabase auth user id
  displayName: text("display_name"),
  timezone: text("timezone").default("UTC"),
  dailyCallTime: text("daily_call_time"), // local "HH:MM"
  phoneE164: text("phone_e164"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── sessions ────────────────────────────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: sessionType("type").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    transcript: jsonb("transcript"),
    audioUrl: text("audio_url"),
    elevenlabsConversationId: text("elevenlabs_conversation_id"),
  },
  (t) => [
    index("sessions_user_started_idx").on(t.userId, t.startedAt),
    // atomic idempotency for the post-call webhook: UNIQUE on conversation_id.
    // Postgres treats NULLs as distinct, so chat/other null-id sessions are fine.
    uniqueIndex("sessions_conversation_idx").on(t.elevenlabsConversationId),
  ],
);

// ── messages ────────────────────────────────────────────────────────────────────
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_session_idx").on(t.sessionId, t.createdAt)],
);

// ── entries (the atomic bank; each is a star) ────────────────────────────────────
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sessionId: uuid("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
    type: entryType("type").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    themes: text("themes").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("entries_user_created_idx").on(t.userId, t.createdAt),
    // ANN index for RAG; hnsw over cosine distance (no training data needed)
    index("entries_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

// ── themes (recurring threads across time) ───────────────────────────────────────
export const themes = pgTable(
  "themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    entryCount: integer("entry_count").notNull().default(0),
    firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("themes_user_idx").on(t.userId),
    // atomic per-user theme upsert (one row per label); see extraction pipeline
    uniqueIndex("themes_user_label_uq").on(t.userId, t.label),
  ],
);

// ── summaries (daily distillations + weekly recaps) ──────────────────────────────
export const summaries = pgTable(
  "summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: summaryKind("kind").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    content: text("content").notNull(), // markdown
    sourceSessionIds: uuid("source_session_ids").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("summaries_user_kind_idx").on(t.userId, t.kind, t.periodStart)],
);

// ── patterns (the heavy memory — surfaced, NEVER interpreted) ─────────────────────
export const patterns = pgTable(
  "patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: patternKind("kind").notNull(),
    summary: text("summary").notNull(),
    provenance: jsonb("provenance"), // { entryIds?: uuid[], sessionIds?: uuid[] }
    surfacedAt: timestamp("surfaced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("patterns_user_idx").on(t.userId, t.surfacedAt)],
);

// ── inferred types ───────────────────────────────────────────────────────────────
export type Profile = typeof profiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type Summary = typeof summaries.$inferSelect;
export type Pattern = typeof patterns.$inferSelect;
