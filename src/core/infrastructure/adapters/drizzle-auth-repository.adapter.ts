import { IAuthRepository, AuthUser } from "../../application/ports/auth-repository.port";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export class DrizzleAuthRepositoryAdapter implements IAuthRepository {
  public async getInternalId(supabaseId: string): Promise<string | null> {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.supabaseId, supabaseId));
    return user?.id || null;
  }

  public async getUser(id: string): Promise<AuthUser | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return null;
    return {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      fullName: user.fullName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      role: user.role as 'admin' | 'user'
    };
  }

  public async getOrCreateUser(data: { supabaseId: string; email: string; fullName?: string; avatarUrl?: string }): Promise<AuthUser> {
    const [existing] = await db.select().from(users).where(eq(users.supabaseId, data.supabaseId));
    if (existing) return {
      id: existing.id,
      supabaseId: existing.supabaseId,
      email: existing.email,
      fullName: existing.fullName || undefined,
      avatarUrl: existing.avatarUrl || undefined,
      role: existing.role as 'admin' | 'user'
    };

    const [inserted] = await db.insert(users).values({
      supabaseId: data.supabaseId,
      email: data.email,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
    }).returning();

    return {
      id: inserted.id,
      supabaseId: inserted.supabaseId,
      email: inserted.email,
      fullName: inserted.fullName || undefined,
      avatarUrl: inserted.avatarUrl || undefined,
      role: inserted.role as 'admin' | 'user'
    };
  }

  public async isAdmin(id: string): Promise<boolean> {
    const user = await this.getUser(id);
    return user?.role === 'admin';
  }
}
