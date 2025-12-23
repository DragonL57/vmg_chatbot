import { PoeService } from './poe.service';
import { QueryDecompositionSchema, type QueryDecomposition } from '@/types/agent';
import { safeJsonParse } from '@/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';

/**
 * Service for the Manager Agent, responsible for query decomposition and orchestration.
 */
export class ManagerService {
  private static readonly SYSTEM_PROMPT = `
You are the Manager Agent for URASys (Unified Retrieval Agent-Based System) at VMG English Center.
Your goal is to decompose the user's latest query into specific search tasks, WHILE CONSIDERING THE CONVERSATION HISTORY for context.

URASys Principles:
1. Context Awareness: Use previous messages to resolve ambiguity (e.g., if user says "IELTS" then "Tuition", "Tuition" means "IELTS Tuition").
2. Just Enough: Prioritize understanding. If a query is ambiguous even with history, mark it as such.
3. Decomposition: Break complex questions into simpler sub-queries.

Output Format (STRICT JSON):
{
  "isAmbiguous": boolean,
  "clarificationQuestion": string | null,
  "subQueries": string[],
  "reasoning": string
}

Guidelines:
- Analyze the ENTIRE conversation history to interpret the latest user message.
- If the latest query is clear given the context, set isAmbiguous to false and provide specific sub-queries.
- If the query remains vague (e.g., "Tell me about courses" with no prior context), set isAmbiguous to true.
- subQueries should be optimized for semantic search.
`.trim();

  /**
   * Decomposes a user query into search tasks or a clarification request, considering history.
   * @param messages - The full conversation history ending with the latest user query.
   */
  static async decompose(messages: { role: string; content: string }[]): Promise<QueryDecomposition> {
    const apiMessages = [
      { role: 'system' as const, content: this.SYSTEM_PROMPT },
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