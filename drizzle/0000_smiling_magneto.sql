CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('idea', 'opinion', 'feeling', 'observation', 'question', 'decision');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'socrates');--> statement-breakpoint
CREATE TYPE "public"."pattern_kind" AS ENUM('recurring', 'contradiction', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('scheduled_call', 'on_demand_voice', 'chat');--> statement-breakpoint
CREATE TYPE "public"."summary_kind" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"type" "entry_type" NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"themes" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "pattern_kind" NOT NULL,
	"summary" text NOT NULL,
	"provenance" jsonb,
	"surfaced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'UTC',
	"daily_call_time" text,
	"phone_e164" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "session_type" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"transcript" jsonb,
	"audio_url" text,
	"elevenlabs_conversation_id" text
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "summary_kind" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"content" text NOT NULL,
	"source_session_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now(),
	"last_seen" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_user_created_idx" ON "entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "entries_embedding_idx" ON "entries" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "messages_session_idx" ON "messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "patterns_user_idx" ON "patterns" USING btree ("user_id","surfaced_at");--> statement-breakpoint
CREATE INDEX "sessions_user_started_idx" ON "sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "sessions_conversation_idx" ON "sessions" USING btree ("elevenlabs_conversation_id");--> statement-breakpoint
CREATE INDEX "summaries_user_kind_idx" ON "summaries" USING btree ("user_id","kind","period_start");--> statement-breakpoint
CREATE INDEX "themes_user_idx" ON "themes" USING btree ("user_id");