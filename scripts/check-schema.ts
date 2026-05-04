import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error('DATABASE_URL missing');

  const sql = postgres(DATABASE_URL, { max: 1 });

  // Check all public tables
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  for (const t of tables) {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t.table_name} ORDER BY ordinal_position`;
    console.log(`${t.table_name}: ${(cols as unknown as Array<{ column_name: string }>).map((c) => c.column_name).join(', ')}`);
  }

  await sql.end();
}

main().catch(console.error);
