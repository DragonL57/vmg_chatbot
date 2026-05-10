ALTER TABLE "agent_traces" ADD COLUMN "is_anonymized" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "knowledge_collections" ADD COLUMN "retrieval_engine" text DEFAULT 'vector' NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_files" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_memories" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;