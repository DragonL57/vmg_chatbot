import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Manually load env for the CLI (local dev)
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is missing. Ensure it is set in .env.local (local) or Vercel Environment Variables (production).");
}

export default defineConfig({
  schema: "./src/core/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
