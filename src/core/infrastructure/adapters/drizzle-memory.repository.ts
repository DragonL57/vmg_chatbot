import { IMemoryRepository } from "../../application/ports/memory-repository.port";
import { UserMemory, MemoryCategory } from "../../domain/entities/memory";
import { db } from "../../db";
import { userMemories } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";

export class DrizzleMemoryRepository implements IMemoryRepository {
  public async getByUserId(userId: string, limit = 20): Promise<UserMemory[]> {
    const results = await db
      .select()
      .from(userMemories)
      .where(eq(userMemories.userId, userId))
      .orderBy(desc(userMemories.createdAt))
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      fact: r.fact,
      category: r.category as MemoryCategory,
      createdAt: r.createdAt || new Date()
    }));
  }

  public async add(userId: string, fact: string, category: MemoryCategory): Promise<void> {
    await db.insert(userMemories).values({
      userId,
      fact,
      category
    }).onConflictDoNothing();
  }

  public async update(id: string, userId: string, fact: string): Promise<void> {
    await db.update(userMemories)
      .set({ fact })
      .where(
        and(
          eq(userMemories.id, id),
          eq(userMemories.userId, userId)
        )
      );
  }

  public async delete(id: string, userId: string): Promise<void> {
    await db.delete(userMemories)
      .where(
        and(
          eq(userMemories.id, id),
          eq(userMemories.userId, userId)
        )
      );
  }
}
