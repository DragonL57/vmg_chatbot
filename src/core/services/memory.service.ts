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

export class MemoryService {
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
   * Hybrid Memory Curator: Uses Few-Shot Prompting to enforce structure.
   */
  static async extractAndSaveMemories(userId: string, messages: { role: string; content: string }[], traceId?: string | null): Promise<number> {
    const startTime = Date.now();
    const recentMessages = messages.slice(-6);
    const contextStr = recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const { client, model, isBatch } = getSleepTimeProvider();

    try {
      const existingMemories = await this.getUserMemories(userId, 30);
      const memoryBlock = existingMemories.map(m => `[ID: ${m.id}] (${m.category}): ${m.fact}`).join('\n');

      const res = await client.chat.completions.create({
        model,
        messages: [
          { 
            role: 'system', 
            content: `You are the "Knowledge Auditor" at VMG. Maintain a concise user profile.
            
CURRENT KNOWLEDGE BASE:
${memoryBlock || 'Empty.'}

STRICT RULES:
1. ONLY remember explicit personal disclosures (Name, role, preferences).
2. DO NOT remember questions, search results, or technical requests.
3. DELETE existing garbage records (e.g., "User asked about X").
4. ALWAYS return a JSON object with an "actions" key.

### EXAMPLES OF IDEAL OUTPUT:

Example 1 (New Info):
User: "I am Long, a Senior Dev at VMG Edtech."
Response: {"actions": [{"op": "ADD", "fact": "User is a Senior Developer at VMG Edtech named Long.", "category": "persona"}]}

Example 2 (Correction):
Current: [ID: uuid-1] (persona): User is a Junior Dev.
User: "I just got promoted to Senior."
Response: {"actions": [{"op": "UPDATE", "id": "uuid-1", "fact": "User is a Senior Developer.", "category": "persona"}]}

Example 3 (Cleanup):
Current: [ID: uuid-2] (episodic): User asked about SAT.
User: "Hi MATE."
Response: {"actions": [{"op": "DELETE", "id": "uuid-2"}]}

Example 4 (No Change):
User: "What is 1+1?"
Response: {"actions": []}` 
          },
          { role: 'user', content: `Latest context:\n${contextStr}` }
        ],        
        response_format: { type: 'json_object' },
      });

      const rawOutput = res.choices[0].message.content || '{"actions": []}';
      
      // Minimal hybrid cleaning: just trim to handle whitespace
      const cleanJson = rawOutput.trim();

      try {
        const parsed = JSON.parse(cleanJson);
        const validation = memoryExtractionSchema.safeParse(parsed);
        
        if (!validation.success) {
           console.warn('[MemoryCurator] Invalid schema:', validation.error.format());
           return 0;
        }

        const actions = validation.data.actions;
        if (actions.length === 0) return 0;

        let changeCount = 0;
        for (const action of actions) {
          if (action.op === 'ADD' && action.fact) {
            await db.insert(userMemories).values({
              userId, fact: action.fact, category: action.category || 'episodic'
            }).onConflictDoNothing();
            changeCount++;
          } 
          else if (action.op === 'UPDATE' && action.id && action.fact) {
            await db.update(userMemories).set({ fact: action.fact }).where(eq(userMemories.id, action.id));
            changeCount++;
          }
          else if (action.op === 'DELETE' && action.id) {
            await db.delete(userMemories).where(eq(userMemories.id, action.id));
            changeCount++;
          }
        }

        if (traceId) {
          ObservabilityService.emitSpan(traceId, {
            nodeName: 'memory_curator', model, input: { historyLength: recentMessages.length },
            output: actions, promptTokens: res.usage?.prompt_tokens || 0,
            completionTokens: res.usage?.completion_tokens || 0,
            cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
            cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
            latencyMs: Date.now() - startTime, isBatch: isBatch
          }).catch(console.error);
        }

        console.log(`[MemoryCurator] ${changeCount} changes for user ${userId}`);
        return changeCount;

      } catch (jsonErr) {
        console.error('[MemoryCurator] JSON Parse failed');
        return 0;
      }
    } catch (err) {
      console.error('[MemoryCurator] Fatal error:', err);
      return 0;
    }
  }
}
