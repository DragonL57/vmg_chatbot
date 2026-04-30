import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function run() {
  console.warn('⏳ Applying database indexes...');
  try {
    await sql`CREATE INDEX IF NOT EXISTS user_id_idx ON conversations (user_id);`;
    console.warn('✅ Index user_id_idx created successfully');
  } catch (err) {
    console.error('❌ Failed to apply index:', err);
  } finally {
    await sql.end();
  }
}

run();
