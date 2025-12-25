import { PoeService } from './poe.service';
import { QueryDecompositionSchema, type QueryDecomposition } from '@/types/agent';
import { safeJsonParse } from '@/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { SAFETY_SPECIALIST_PROMPT } from '@/prompts/specialists/safety';
import { LEAD_SPECIALIST_PROMPT } from '@/prompts/specialists/lead';
import { PLANNER_SPECIALIST_PROMPT } from '@/prompts/specialists/planner';

/**
 * Orchestrator Service that coordinates specialized agents in parallel.
 */
export class ManagerService {
  /**
   * Decomposes a user query using parallel specialists.
   */
  static async decompose(messages: { role: string; content: string }[]): Promise<QueryDecomposition> {
    const history = messages.map(m => ({ 
      role: m.role as 'user' | 'assistant' | 'system', 
      content: m.content 
    }));

    // Execute specialists in parallel
    const [safetyRes, leadRes, plannerRes] = await Promise.all([
      PoeService.chat([{ role: 'system', content: SAFETY_SPECIALIST_PROMPT }, ...history]),
      PoeService.chat([{ role: 'system', content: LEAD_SPECIALIST_PROMPT }, ...history]),
      PoeService.chat([{ role: 'system', content: PLANNER_SPECIALIST_PROMPT }, ...history]),
    ]);

    const safetyContent = (safetyRes as ChatCompletion).choices[0].message.content || '';
    const leadContent = (leadRes as ChatCompletion).choices[0].message.content || '';
    const plannerContent = (plannerRes as ChatCompletion).choices[0].message.content || '';

    console.log('--- SPECIALIST RAW RESPONSES ---');
    console.log('Safety:', safetyContent);
    console.log('Lead:', leadContent);
    console.log('Planner:', plannerContent);

    const safetyData = safeJsonParse<{ isSafe: boolean; reason: string | null }>(safetyContent);
    const leadData = safeJsonParse<{ extractedLead: Record<string, unknown> }>(leadContent);
    const plannerData = safeJsonParse<Record<string, unknown>>(plannerContent);

    // Merge results with proper partial typing
    const combined = {
      isSafe: safetyData?.isSafe ?? true,
      safetyReason: safetyData?.reason ?? null,
      ...(plannerData || {}),
      extractedLead: (leadData?.extractedLead as Record<string, unknown>) ?? null,
    } as Record<string, unknown>;

    // Validate with Zod
    const result = QueryDecompositionSchema.safeParse(combined);
    if (!result.success) {
      console.error('Orchestration Validation Error:', result.error);
      // Fallback to minimal valid object if validation fails partially
      return {
        isSafe: (safetyData?.isSafe) ?? true,
        safetyReason: safetyData?.reason ?? null,
        isAmbiguous: (combined.isAmbiguous as boolean) ?? false,
        canAnswerFromStatic: (combined.canAnswerFromStatic as boolean) ?? false,
        subQueries: (combined.subQueries as string[]) ?? [],
        reasoning: 'Orchestrated from parallel specialists',
        extractedLead: combined.extractedLead as QueryDecomposition['extractedLead'],
        externalApiCall: combined.externalApiCall as QueryDecomposition['externalApiCall'],
      };
    }

    return result.data;
  }
}