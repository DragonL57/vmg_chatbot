import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

/**
 * Singleton pattern for the database client to prevent connection leaks 
 * during Next.js hot reloads in development mode.
 * 
 * IMPORTANT: For Supabase, use the Transaction Pooler URL (Port 6543).
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL, {
  max: process.env.NODE_ENV === 'production' ? 10 : 5, // Increased from 1 to 5 for dev
  prepare: false, // REQUIRED for Supabase Transaction Pooler
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
