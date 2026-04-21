CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location_coords" jsonb,
	"location_address" text,
	"token_usage" jsonb,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"qdrant_name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_collections_name_unique" UNIQUE("name"),
	CONSTRAINT "knowledge_collections_qdrant_name_unique" UNIQUE("qdrant_name")
);
--> statement-breakpoint
CREATE TABLE "knowledge_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"source_url" text,
	"status" text NOT NULL,
	"error_message" text,
	"mode" text NOT NULL,
	"folder" text DEFAULT 'root',
	"progress" integer DEFAULT 0,
	"summary" text,
	"logs" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_files_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reported_message" text NOT NULL,
	"conversation" jsonb NOT NULL,
	"note" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now()
);
