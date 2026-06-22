-- Tie profiles to the Supabase auth user, and lock every user-scoped table with
-- Row Level Security. The postgres/service_role connections (Drizzle runtime +
-- the secret-key pipeline) BYPASS RLS; the publishable/authenticated client is
-- gated to the user's own rows. See SPEC §5/§11.

-- profiles.id IS the auth user id
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_users_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- enable RLS
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "themes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "summaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patterns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- profiles: a user owns the row whose id is their uid
CREATE POLICY "own_profile" ON "profiles" FOR ALL TO authenticated
  USING ("id" = (select auth.uid()))
  WITH CHECK ("id" = (select auth.uid()));--> statement-breakpoint

-- sessions
CREATE POLICY "own_sessions" ON "sessions" FOR ALL TO authenticated
  USING ("user_id" = (select auth.uid()))
  WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint

-- entries
CREATE POLICY "own_entries" ON "entries" FOR ALL TO authenticated
  USING ("user_id" = (select auth.uid()))
  WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint

-- themes
CREATE POLICY "own_themes" ON "themes" FOR ALL TO authenticated
  USING ("user_id" = (select auth.uid()))
  WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint

-- summaries
CREATE POLICY "own_summaries" ON "summaries" FOR ALL TO authenticated
  USING ("user_id" = (select auth.uid()))
  WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint

-- patterns
CREATE POLICY "own_patterns" ON "patterns" FOR ALL TO authenticated
  USING ("user_id" = (select auth.uid()))
  WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint

-- messages: ownership flows through the parent session
CREATE POLICY "own_messages" ON "messages" FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "sessions" s
      WHERE s."id" = "messages"."session_id"
        AND s."user_id" = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "sessions" s
      WHERE s."id" = "messages"."session_id"
        AND s."user_id" = (select auth.uid())
    )
  );
