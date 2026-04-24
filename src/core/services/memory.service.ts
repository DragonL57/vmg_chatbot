import { db } from '../db';
import { userMemories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getFastProvider } from '../lib/providers';

export interface UserMemory {
  id: string;
  userId: string;
  fact: string;
  category: string;
  createdAt: Date | null;
}

/**
 * Service for Context Engineering - managing user-specific long-term memories.
 */
export class MemoryService {
  /**
   * Retrieves all known facts about a user.
   */
  static async getUserMemories(userId: string): Promise<UserMemory[]> {
    try {
      return await db
        .select()
        .from(userMemories)
        .where(eq(userMemories.userId, userId))
        .orderBy(desc(userMemories.createdAt));
    } catch (err) {
      console.error('[MemoryService] Failed to fetch memories:', err);
      return [];
    }
  }

  /**
   * Extracts new facts from a conversation and saves them.
   * Returns the number of new facts saved.
   */
  static async extractAndSaveMemories(userId: string, messages: { role: string; content: string }[]): Promise<number> {
    // Only look at the last few messages to save tokens
    const recentMessages = messages.slice(-4);
    const contextStr = recentMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const { client, model, extraBody } = getFastProvider();

    try {
      const existingMemories = await this.getUserMemories(userId);
      const existingFactsStr = existingMemories.map(m => m.fact).join(', ');

      const res = await client.chat.completions.create({
        model,
        messages: [
          { 
            role: 'system', 
            content: `Bạn là "Knowledge Architect". Nhiệm vụ của bạn là trích xuất và CẤU TRÚC LẠI tri thức về người dùng.
            
QUY TẮC TRÍCH XUẤT:
1. Viết ở ngôi thứ ba: Luôn bắt đầu bằng "Người dùng..." hoặc "User..." (ví dụ: "Người dùng là chuyên viên Edtech").
2. Ngôn ngữ: Sử dụng tiếng Việt chuẩn, chuyên nghiệp.
3. Tránh trùng lặp: KHÔNG trích xuất các sự thật đã tồn tại trong danh sách tri thức hiện tại.
4. Tinh gọn: Mỗi sự thật phải ngắn gọn, súc tích, mang tính định danh hoặc sở thích bền vững.

TRI THỨC HIỆN TẠI (KHÔNG ĐƯỢC LẶP LẠI):
${existingFactsStr || 'Chưa có tri thức nào.'}

Định dạng trả về: JSON object { "memories": [{ "fact": "chuỗi sự thật", "category": "persona|preference|entity|episodic" }] }.
Nếu không có thông tin mới hoặc thông tin đã tồn tại, trả về { "memories": [] }.` 
          },
          { role: 'user', content: `Đoạn chat mới nhất:\n${contextStr}` }
        ],
        response_format: { type: 'json_object' },
        ...(extraBody ? { extra_body: extraBody } : {}),
      });

      const output = res.choices[0].message.content || '{"memories": []}';
      let memories: { fact: string; category: string }[] = [];
      try {
        const parsed = JSON.parse(output);
        memories = parsed.memories || [];
      } catch (e) {}

      if (memories.length > 0) {
        // Final sanity check against exact duplicates before saving
        const finalToSave = memories.filter(m => 
          !existingMemories.some(ex => ex.fact.toLowerCase() === m.fact.toLowerCase())
        );

        if (finalToSave.length > 0) {
          console.log(`[MemoryService] Saving ${finalToSave.length} refined facts for user ${userId}`);
          await Promise.all(
            finalToSave.map(m => 
              db.insert(userMemories).values({
                userId,
                fact: m.fact,
                category: m.category
              }).onConflictDoNothing()
            )
          );
          return finalToSave.length;
        }
      }
      return 0;
    } catch (err) {
      console.error('[MemoryService] Extraction error:', err);
      return 0;
    }
  }
}
