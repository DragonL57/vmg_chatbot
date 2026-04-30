import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables for the migration script
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is missing. Check your .env.local file.");
}

const runMigration = async () => {
  const sql = postgres(dbUrl, { max: 1 });
  const db = drizzle(sql);

  console.warn("⏳ Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.warn("✅ Migrations completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
};

runMigration();
