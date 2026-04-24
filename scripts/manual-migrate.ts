import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is missing. Check your .env.local file.");
}

const runManualMigration = async () => {
  const sql = postgres(dbUrl, { max: 1 });

  console.log("⏳ Running manual safe migrations...");

  try {
    // 1. Create Enums if they don't exist
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM('admin', 'staff', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Users table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "supabase_id" uuid NOT NULL UNIQUE,
        "email" text NOT NULL UNIQUE,
        "full_name" text,
        "avatar_url" text,
        "role" user_role DEFAULT 'user' NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 3. Create User Memories table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "user_memories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES users(id),
        "fact" text NOT NULL,
        "category" text DEFAULT 'general' NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 4. Add missing columns to Conversations
    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TABLE "conversations" ADD COLUMN "user_id" uuid REFERENCES users(id);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "conversations" ADD COLUMN "title" text DEFAULT 'Cuộc hội thoại mới';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "conversations" ADD COLUMN "is_starred" integer DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 5. Add indexes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS "user_memories_user_id_idx" ON "user_memories" ("user_id");
      CREATE INDEX IF NOT EXISTS "user_id_idx" ON "conversations" ("user_id");
    `);

    console.log("✅ Manual migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
};

runManualMigration();
