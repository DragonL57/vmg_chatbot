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
 * No PII (email, name) is written to console logs.
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function scrubSupabaseAuth(supabaseId: string | null, anonId: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || !supabaseId) {
    console.log('  [skip] Supabase Auth not scrubbed — set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    return;
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.updateUserById(supabaseId, {
      email: `${anonId}@anonymized.local`,
      user_metadata: {},
    });
    if (error) {
      console.error('  [warn] Auth record update failed:', error.message);
    } else {
      console.log('  [ok] Supabase Auth record scrubbed');
    }
  } catch (e) {
    console.error('  [warn] Could not initialize Supabase admin client:', e instanceof Error ? e.message : e);
  }
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('[anonymize-user] DATABASE_URL is missing. Check .env.local');
    process.exit(1);
  }

  const identifier = process.argv[2];
  if (!identifier) {
    console.error('[anonymize-user] Usage: npx tsx scripts/anonymize-user.ts <email|supabase_id>');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Find the user by email or supabase_id
    const isEmail = identifier.includes('@');
    const users = isEmail
      ? await sql`SELECT id, email, supabase_id FROM users WHERE email = ${identifier}`
      : await sql`SELECT id, email, supabase_id FROM users WHERE supabase_id = ${identifier}`;

    if (users.length === 0) {
      console.error('[anonymize-user] User not found');
      process.exit(1);
    }

    const user = users[0];
    const anonId = `anon-${Math.random().toString(36).slice(2, 10)}`;

    console.log(`[anonymize-user] Found internal user: ${user.id}`);
    console.log('[anonymize-user] Anonymizing data...');

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
    console.log('  [ok] Profile anonymized');

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
    console.log('  [ok] Conversations cleared');

    // Delete memories
    const memResult = await sql`DELETE FROM user_memories WHERE user_id = ${user.id}`;
    console.log(`  [ok] ${memResult.count} memories deleted`);

    // Scrub span payloads FIRST (before nulling userId on agent_traces)
    const traceRows = await sql`SELECT id FROM agent_traces WHERE user_id = ${user.id}`;
    if (traceRows.length > 0) {
      const traceIds = traceRows.map((r: { id: string }) => r.id);
      await sql`UPDATE agent_spans SET input = NULL, output = NULL WHERE trace_id = ANY(${traceIds}::uuid[])`;
      console.log(`  [ok] ${traceIds.length} trace spans scrubbed`);
    }

    // Anonymize traces (keep for audit, remove user/conversation link, mark as anonymized)
    await sql`UPDATE agent_traces SET user_id = NULL, conversation_id = NULL, is_anonymized = 1 WHERE user_id = ${user.id}`;
    console.log('  [ok] Traces anonymized');

    // Anonymize reports — clear all user-generated content
    await sql`UPDATE reports SET user_id = NULL, reported_message = 'Anonymized', conversation = '[]'::jsonb, note = NULL WHERE user_id = ${user.id}`;
    console.log('  [ok] Reports anonymized');

    await scrubSupabaseAuth(user.supabase_id, anonId);

    console.log(`\n[anonymize-user] User (internal ID: ${user.id}) anonymized.`);
    console.log(`  Anonymized ID: ${anonId}@anonymized.local`);
    console.log('  Data preserved for audit but no longer linked to the individual.');
  } catch (error) {
    console.error('[anonymize-user] Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
