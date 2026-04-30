import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
const targetEmail = process.argv[2];

if (!dbUrl) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}

if (!targetEmail) {
  console.error('❌ Target email missing. Usage: npx tsx scripts/promote-admin.ts <email>');
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function run() {
  console.warn(`⏳ Promoting user to admin: ${targetEmail}...`);
  try {
    const result = await sql`
      UPDATE users 
      SET role = 'admin' 
      WHERE email = ${targetEmail}
      RETURNING id, email, role;
    `;
    
    if (result.length > 0) {
      console.warn('✅ User promoted successfully:', result[0]);
    } else {
      console.warn('⚠️ User not found in the database. Ensure you have logged in at least once.');
    }
  } catch (err) {
    console.error('❌ Failed to promote user:', err);
  } finally {
    await sql.end();
  }
}

run();
