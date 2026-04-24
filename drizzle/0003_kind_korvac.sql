CREATE TABLE "user_memory_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"batch_id" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"output_file_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_memory_tasks_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
ALTER TABLE "user_memory_tasks" ADD CONSTRAINT "user_memory_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;