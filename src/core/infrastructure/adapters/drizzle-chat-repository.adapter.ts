import { IChatRepository, Conversation } from "../../application/ports/chat-repository.port";
import { db } from "../../db";
import { conversations, users } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export class DrizzleChatRepositoryAdapter implements IChatRepository {
  async listByUser(userId: string): Promise<Conversation[]> {
    const results = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        isStarred: conversations.isStarred,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.isStarred), desc(conversations.updatedAt));

    return results.map(r => ({
      id: r.id,
      title: r.title || 'Cuộc hội thoại mới',
      isStarred: r.isStarred === 1,
      updatedAt: r.updatedAt || new Date()
    }));
  }

  async getById(id: string, userId: string): Promise<any> {
    const [result] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!result || result.userId !== userId) return null;
    return result;
  }

  async upsert(payload: any): Promise<void> {
    const firstMessageContent = payload.messages[0]?.content || '';
    const fallbackTitle = firstMessageContent 
      ? (firstMessageContent.slice(0, 40) + (firstMessageContent.length > 40 ? '...' : ''))
      : "Cuộc hội thoại mới";

    const finalTitle = payload.title || fallbackTitle;

    await db.insert(conversations)
      .values({
        id: payload.id,
        userId: payload.userId,
        title: finalTitle,
        messages: payload.messages,
        locationCoords: payload.locationCoords,
        locationAddress: payload.locationAddress,
        tokenUsage: payload.tokenUsage,
        messageCount: payload.messageCount,
        updatedAt: payload.updatedAt || new Date(),
      })
      .onConflictDoUpdate({
        target: conversations.id,
        set: {
          userId: payload.userId || undefined,
          title: payload.title || undefined, 
          messages: payload.messages,
          locationCoords: payload.locationCoords,
          locationAddress: payload.locationAddress,
          tokenUsage: payload.tokenUsage,
          messageCount: payload.messageCount,
          updatedAt: payload.updatedAt || new Date(),
        },
        where: payload.userId ? eq(conversations.userId, payload.userId) : sql`${conversations.userId} IS NULL`,
      });
  }

  async delete(id: string, userId: string): Promise<void> {
    await db.delete(conversations).where(
      sql`${conversations.id} = ${id} AND ${conversations.userId} = ${userId}`
    );
  }

  async star(id: string, userId: string, isStarred: boolean): Promise<void> {
    await db.update(conversations)
      .set({ isStarred: isStarred ? 1 : 0, updatedAt: new Date() })
      .where(sql`${conversations.id} = ${id} AND ${conversations.userId} = ${userId}`);
  }

  async rename(id: string, userId: string, title: string): Promise<void> {
    await db.update(conversations)
      .set({ title })
      .where(sql`${conversations.id} = ${id} AND ${conversations.userId} = ${userId}`);
  }
}
