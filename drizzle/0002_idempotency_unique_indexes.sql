-- Make the post-call pipeline race-safe. ElevenLabs retries webhooks, so the
-- SELECT-then-INSERT dedupe (sessions) and SELECT-then-upsert (themes) could
-- double-process under concurrent deliveries. Back them with UNIQUE indexes so
-- the inserts can use ON CONFLICT atomically.

-- sessions: unique conversation_id. Postgres NULLs are distinct by default, so
-- chat / null-id sessions are unaffected; only real conversation ids are unique.
DROP INDEX IF EXISTS "sessions_conversation_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_conversation_idx"
  ON "sessions" ("elevenlabs_conversation_id");--> statement-breakpoint

-- themes: one row per (user, label) so counts never fragment across duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS "themes_user_label_uq"
  ON "themes" ("user_id", "label");
