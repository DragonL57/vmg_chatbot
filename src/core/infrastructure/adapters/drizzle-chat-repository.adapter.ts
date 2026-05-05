import { IChatRepository, Conversation, ConversationPayload } from "../../application/ports/chat-repository.port";
import { db } from "../../db";
import { conversations, agentTraces, agentSpans } from "../../db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { ChatSession, Message } from "../../types/chat";

export class DrizzleChatRepositoryAdapter implements IChatRepository {
  public async listByUser(userId: string): Promise<Conversation[]> {
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

  public async getById(id: string, userId: string): Promise<ChatSession | null> {
    const [result] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!result || result.userId !== userId) return null;
    return {
      id: result.id,
      messages: (result.messages as Message[]) || [],
      createdAt: result.createdAt || new Date(),
      updatedAt: result.updatedAt || new Date()
    };
  }

  public async ensureExists(id: string, userId: string): Promise<void> {
    await db.insert(conversations)
      .values({
        id,
        userId,
        title: 'Cuộc hội thoại mới',
        messages: [],
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  public async upsert(payload: ConversationPayload): Promise<void> {
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

  public async delete(id: string, userId: string): Promise<void> {
    // Unlink agent traces before deleting to avoid FK violation
    const traceIds = await db.select({ id: agentTraces.id })
      .from(agentTraces)
      .where(sql`${agentTraces.conversationId} = ${id}`);

    if (traceIds.length > 0) {
      const ids = traceIds.map(t => t.id);
      // Scrub span payloads before unlinking traces
      await db.update(agentSpans)
        .set({ input: null, output: null })
        .where(inArray(agentSpans.traceId, ids));

      // Unlink traces from conversation
      await db.update(agentTraces)
        .set({ conversationId: null })
        .where(inArray(agentTraces.id, ids));
    }

    await db.delete(conversations).where(
      sql`${conversations.id} = ${id} AND ${conversations.userId} = ${userId}`
    );
  }

  public async star(id: string, userId: string, isStarred: boolean): Promise<void> {
    await db.update(conversations)
      .set({ isStarred: isStarred ? 1 : 0, updatedAt: new Date() })
      .where(sql`${conversations.id} = ${id} AND ${conversations.userId} = ${userId}`);
  }

  public async rename(id: string, userId: string, title: string): Promise<void> {
    await db.update(conversations)
      .set({ title })
      .where(sql`${conversations.id} = ${id} AND ${conversations.userId} = ${userId}`);
  }
}
