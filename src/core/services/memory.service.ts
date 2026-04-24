import { db } from '../db';
import { userMemories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getFastProvider } from '../lib/providers';
import { z } from 'zod';

const memoryExtractionSchema = z.object({
  memories: z.array(z.object({
    fact: z.string().min(1).max(1000),
    category: z.enum(['persona', 'preference', 'entity', 'episodic'])
  }))
});

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
   * Retrieves all known facts about a user, with a hard limit to prevent context overflow.
   */
  static async getUserMemories(userId: string, limit = 20): Promise<UserMemory[]> {
    try {
      return await db
        .select()
        .from(userMemories)
        .where(eq(userMemories.userId, userId))
        .orderBy(desc(userMemories.createdAt))
        .limit(limit);
    } catch (err) {
      console.error('[MemoryService] Failed to fetch memories:', err);
      return [];
    }
  }

  /**
   * Sleep-time Memory Curator (Letta-inspired Asynchronous Management).
   * Instead of just extracting, this agent reconciles new info with existing memory blocks.
   */
  static async extractAndSaveMemories(userId: string, messages: { role: string; content: string }[]): Promise<number> {
    const recentMessages = messages.slice(-6);
    const contextStr = recentMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const { client, model, extraBody } = getFastProvider();

    try {
      // 1. Retrieve Current Memory State (to allow the agent to reflect and reconcile)
      const existingMemories = await this.getUserMemories(userId, 30);
      const memoryBlock = existingMemories.map(m => `[ID: ${m.id}] (${m.category}): ${m.fact}`).join('\n');

      // 2. Metacognitive Reconciliation Prompt
      const res = await client.chat.completions.create({
        model,
        messages: [
          { 
            role: 'system', 
            content: `Bạn là "Memory Curator Agent" (Sleep-time compute). 
Nhiệm vụ: Quản lý "Khối tri thức" về người dùng để đảm bảo tính CHÍNH XÁC và KHÔNG TRÙNG LẶP.

KHỐI TRI THỨC HIỆN TẠI:
${memoryBlock || 'Trống.'}

DỰA TRÊN ĐOẠN CHAT MỚI, HÃY THỰC HIỆN CÁC THAO TÁC SAU:
1. ADD: Nếu có sự thật hoàn toàn mới (viết ở ngôi thứ ba "Người dùng...").
2. UPDATE: Nếu thông tin mới đính chính hoặc bổ sung cho ID hiện có.
3. DELETE: Nếu thông tin hiện tại là sai hoặc TRÙNG LẶP với thông tin khác (giữ lại 1 bản ghi tốt nhất).

QUY TẮC CẤU TRÚC:
- Viết ở ngôi thứ ba. 
- Category: persona (vai trò/danh tính), preference (sở thích), entity (địa điểm/phòng ban), episodic (sự kiện).
- KHÔNG tạo ra các bản ghi có nội dung tương tự nhau (VD: "Tên là Long" và "Tên người dùng là Long" -> MERGE lại).

Định dạng trả về JSON:
{
  "actions": [
    { "op": "ADD", "fact": "...", "category": "..." },
    { "op": "UPDATE", "id": "uuid", "fact": "..." },
    { "op": "DELETE", "id": "uuid" }
  ]
}` 
          },
          { role: 'user', content: `Đoạn chat mới nhất:\n${contextStr}` }
        ],
        response_format: { type: 'json_object' },
        ...(extraBody ? { extra_body: extraBody } : {}),
      });

      const output = res.choices[0].message.content || '{"actions": []}';
      const { actions } = JSON.parse(output);

      if (!actions || actions.length === 0) return 0;

      let changeCount = 0;
      for (const action of actions) {
        try {
          if (action.op === 'ADD') {
            await db.insert(userMemories).values({
              userId,
              fact: action.fact,
              category: action.category
            }).onConflictDoNothing();
            changeCount++;
          } 
          else if (action.op === 'UPDATE' && action.id) {
            await db.update(userMemories)
              .set({ fact: action.fact })
              .where(eq(userMemories.id, action.id));
            changeCount++;
          }
          else if (action.op === 'DELETE' && action.id) {
            await db.delete(userMemories).where(eq(userMemories.id, action.id));
            changeCount++;
          }
        } catch (e) {
          console.error('[MemoryCurator] Action failed:', action, e);
        }
      }

      console.log(`[MemoryCurator] Reconciled ${changeCount} changes for user ${userId}`);
      return changeCount;
    } catch (err) {
      console.error('[MemoryCurator] Fatal error:', err);
      return 0;
    }
  }
}
