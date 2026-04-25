import { db } from '../db';
import { userMemories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSleepTimeProvider } from '../lib/providers';
import { z } from 'zod';
import { ObservabilityService } from './observability.service';

const memoryExtractionSchema = z.object({
  actions: z.array(z.object({
    op: z.enum(['ADD', 'UPDATE', 'DELETE']),
    fact: z.string().optional(),
    category: z.enum(['persona', 'preference', 'entity', 'episodic']).optional(),
    id: z.string().uuid().optional()
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
  static async extractAndSaveMemories(userId: string, messages: { role: string; content: string }[], traceId?: string | null): Promise<number> {
    const startTime = Date.now();
    const recentMessages = messages.slice(-6);
    const contextStr = recentMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const { client, model, isBatch } = getSleepTimeProvider();

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
            content: `Bạn là "Sát thủ Tri thức" (Knowledge Auditor) tại VMG. 
        Nhiệm vụ: Duy trì bộ hồ sơ NGƯỜI DÙNG cực kỳ tinh gọn.

        KHỐI TRI THỨC HIỆN TẠI:
        ${memoryBlock || 'Trống.'}

        QUY TẮC CỰC KỲ NGHIÊM NGẶT (CHỐNG RÁC):
        1. CHỈ GHI NHỚ khi người dùng tự tiết lộ thông tin cá nhân (Tên, vai trò, sở thích cá nhân, kế hoạch cụ thể).
        2. TUYỆT ĐỐI KHÔNG ghi nhớ:
        - Các câu hỏi của người dùng ("là gì", "hsk là gì", "dịch từ này...").
        - Các thông tin mà AI tìm thấy trong tài liệu (AI không được tự suy diễn sở thích).
        - Các yêu cầu kỹ thuật (dịch thuật, tóm tắt).
        3. CATEGORY: persona (danh tính), preference (sở thích cá nhân), entity (địa điểm/phòng ban làm việc).
        4. DELETE NGAY LẬP TỨC: Nếu thấy trong KHỐI TRI THỨC HIỆN TẠI có các bản ghi là "Câu hỏi" hoặc "Yêu cầu dịch thuật" (VD: "Người dùng hỏi về...", "Người dùng yêu cầu...").

        Định dạng JSON:
        {
        "actions": [
        { "op": "ADD", "fact": "Sự thật về người dùng (ngôi thứ ba)", "category": "..." },
        { "op": "UPDATE", "id": "uuid", "fact": "Thông tin mới" },
        { "op": "DELETE", "id": "uuid" }
        ]
        }` 
          },
          { role: 'user', content: `Đoạn chat mới nhất:\n${contextStr}` }
        ],
        response_format: { type: 'json_object' },
      });

      const output = res.choices[0].message.content || '{"actions": []}';
      
      let actions: any[] = [];
      try {
        const parsed = JSON.parse(output);
        const validation = memoryExtractionSchema.safeParse(parsed);
        if (!validation.success) {
           console.warn('[MemoryCurator] Response failed validation:', validation.error.format());
           return 0;
        }
        actions = validation.data.actions;
      } catch (e) {
        console.error('[MemoryCurator] Response was not valid JSON');
        return 0;
      }

      if (!actions || actions.length === 0) return 0;

      let changeCount = 0;
      for (const action of actions) {
        try {
          if (action.op === 'ADD' && action.fact) {
            await db.insert(userMemories).values({
              userId,
              fact: action.fact,
              category: action.category || 'general'
            }).onConflictDoNothing();
            changeCount++;
          } 
          else if (action.op === 'UPDATE' && action.id && action.fact) {
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

      // Record span for observability (Batch aware)
      if (traceId) {
        ObservabilityService.emitSpan(traceId, {
          nodeName: 'memory_curator',
          model,
          input: { historyLength: recentMessages.length },
          output: actions,
          promptTokens: res.usage?.prompt_tokens || 0,
          completionTokens: res.usage?.completion_tokens || 0,
          cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
          cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
          latencyMs: Date.now() - startTime,
          isBatch: isBatch
        }).catch(console.error);
      }

      console.log(`[MemoryCurator] Reconciled ${changeCount} changes for user ${userId}`);
      return changeCount;
    } catch (err) {
      console.error('[MemoryCurator] Fatal error:', err);
      return 0;
    }
  }
}
