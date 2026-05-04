/**
 * Termination Cleanup Script — Anonymize a user's data when employment ends.
 *
 * Complies with Law 91/2025/QH15: "Dữ liệu người lao động phải bị xóa
 * sau khi chấm dứt hợp đồng lao động" (employee data must be deleted
 * after contract termination).
 *
 * Usage:
 *   npx tsx scripts/anonymize-user.ts <email|supabase_id>
 *
 * This permanently anonymizes the user's personal data while preserving
 * audit integrity (traces are kept but user link is removed).
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing. Check .env.local');
    process.exit(1);
  }

  const identifier = process.argv[2];
  if (!identifier) {
    console.error('❌ Usage: npx tsx scripts/anonymize-user.ts <email|supabase_id>');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Find the user
    const isEmail = identifier.includes('@');
    const users = isEmail
      ? await sql`SELECT id, email, supabase_id FROM users WHERE email = ${identifier}`
      : await sql`SELECT id, email, supabase_id FROM users WHERE supabase_id = ${identifier}`;

    if (users.length === 0) {
      console.error(`❌ User not found: ${identifier}`);
      process.exit(1);
    }

    const user = users[0];
    const anonId = `anon-${Math.random().toString(36).slice(2, 10)}`;

    console.log(`🔍 Found user: ${user.email} (${user.id})`);
    console.log(`⏳ Anonymizing data...`);

    // Anonymize user profile
    await sql`
      UPDATE users SET
        email = ${`${anonId}@anonymized.local`},
        full_name = NULL,
        avatar_url = NULL,
        metadata = ${JSON.stringify({ anonymizedAt: new Date().toISOString() })},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;
    console.log(`  ✓ Profile anonymized`);

    // Clear conversations
    await sql`
      UPDATE conversations SET
        title = 'Anonymized',
        messages = '[]'::jsonb,
        token_usage = NULL,
        location_coords = NULL,
        location_address = NULL,
        metadata = ${JSON.stringify({ anonymized: true })},
        updated_at = NOW()
      WHERE user_id = ${user.id}
    `;
    console.log(`  ✓ Conversations cleared`);

    // Delete memories
    const memResult = await sql`DELETE FROM user_memories WHERE user_id = ${user.id}`;
    console.log(`  ✓ ${memResult.count} memories deleted`);

    // Anonymize traces (keep for audit, remove user link)
    await sql`UPDATE agent_traces SET is_anonymized = 1, user_id = NULL WHERE user_id = ${user.id}`;
    console.log(`  ✓ Traces anonymized`);

    // Anonymize reports
    await sql`UPDATE reports SET user_id = NULL, note = NULL WHERE user_id = ${user.id}`;
    console.log(`  ✓ Reports anonymized`);

    console.log(`\n✅ User ${user.email} has been anonymized successfully.`);
    console.log(`   Data is preserved for audit but no longer linked to the individual.`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
