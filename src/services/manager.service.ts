import { PoeService } from './poe.service';
import { QueryDecompositionSchema, type QueryDecomposition } from '@/types/agent';
import { safeJsonParse } from '@/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { MANAGER_PROMPT } from '@/prompts/manager';

/**
 * Service for the Manager Agent, responsible for query decomposition and orchestration.
 */
export class ManagerService {
  /**
   * Decomposes a user query into search tasks or a clarification request, considering history.
   * @param messages - The full conversation history ending with the latest user query.
   */
  static async decompose(messages: { role: string; content: string }[]): Promise<QueryDecomposition> {
    const apiMessages = [
      { role: 'system' as const, content: MANAGER_PROMPT },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    ];

    // We know stream is false by default, so we cast to ChatCompletion
    const response = (await PoeService.chat(apiMessages)) as ChatCompletion;
    const content = response.choices[0].message.content || '';

    const parsed = safeJsonParse<QueryDecomposition>(content);
    
    if (!parsed) {
      throw new Error('Failed to parse Manager Agent response as JSON');
    }

    // Validate with Zod
    const result = QueryDecompositionSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Zod validation error:', result.error);
      throw new Error('Manager Agent response does not match the expected schema');
    }

    return result.data;
  }
}