import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error('DATABASE_URL missing');

  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`;
    console.log('✓ users.metadata');

    // Conversations table
    await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`;
    console.log('✓ conversations.metadata');

    // Agent traces
    await sql`ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS is_anonymized integer DEFAULT 0`;
    console.log('✓ agent_traces.is_anonymized');

    // User memories - missing metadata column (blocks chat)
    await sql`ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`;
    console.log('✓ user_memories.metadata');

    // Add unique index on user_memories(user_id, fact) if missing
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'user_memories' 
          AND indexname = 'user_memories_user_fact_unique'
        ) THEN
          CREATE UNIQUE INDEX user_memories_user_fact_unique ON user_memories (user_id, fact);
        END IF;
      END
      $$;
    `;
    console.log('✓ user_memories unique index');

    // User consent table check
    await sql`ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS ip_address text`;
    await sql`ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS user_agent text`;
    console.log('✓ user_consents columns');

    console.log('\n✅ All schema drift fixed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
