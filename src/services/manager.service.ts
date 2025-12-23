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
Your goal is to decompose a user's query into specific search tasks.

URASys Principles:
1. Just Enough: Prioritize understanding. If a query is ambiguous, mark it as such and provide a clarification question.
2. Decomposition: Break complex questions into simpler sub-queries.

Output Format (STRICT JSON):
{
  "isAmbiguous": boolean,
  "clarificationQuestion": string | null,
  "subQueries": string[],
  "reasoning": string
}

Guidelines:
- If the query is clear, set isAmbiguous to false and provide 1-3 specific sub-queries for retrieval.
- If the query is vague (e.g., "Tell me about courses" without specifying level or type), set isAmbiguous to true and provide a clarificationQuestion.
- subQueries should be optimized for semantic search in Vietnamese or English.
- Always provide reasoning for your decision.
`.trim();

  /**
   * Decomposes a user query into search tasks or a clarification request.
   */
  static async decompose(query: string): Promise<QueryDecomposition> {
    const messages = [
      { role: 'system' as const, content: this.SYSTEM_PROMPT },
      { role: 'user' as const, content: query },
    ];

    // We know stream is false by default, so we cast to ChatCompletion
    const response = (await PoeService.chat(messages)) as ChatCompletion;
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