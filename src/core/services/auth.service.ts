import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const ALLOWED_DOMAIN = 'vmg.edu.vn';

export async function getOrCreateUser(supabaseUser: { id: string, email?: string, user_metadata?: any }) {
  if (!supabaseUser.email) throw new Error('User email is required');

  // Validate domain
  if (!supabaseUser.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Only ${ALLOWED_DOMAIN} emails are allowed`);
  }

  const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name;
  const avatarUrl = supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture;

  // 3. Upsert user to keep metadata (name/avatar) fresh
  const [user] = await db.insert(users).values({
    supabaseId: supabaseUser.id,
    email: supabaseUser.email,
    fullName,
    avatarUrl,
    role: 'user', // Default role for new users
  })
  .onConflictDoUpdate({
    target: users.supabaseId,
    set: {
      fullName,
      avatarUrl,
      updatedAt: new Date(),
    }
  })
  .returning();

  return user;
}

export async function getUserRole(supabaseId: string) {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.supabaseId, supabaseId));
  return user?.role || 'user';
}

export async function isAdmin(supabaseId: string) {
  const role = await getUserRole(supabaseId);
  return role === 'admin';
}

export async function getInternalUserId(supabaseId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.supabaseId, supabaseId),
    columns: { id: true }
  });
  return user?.id || null;
}
