import { PoeService } from './poe.service';
import { safeJsonParse } from '@/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { GUARDRAILS_PROMPT } from '@/prompts/guardrails';

/**
 * Service for input validation and security guardrails using an LLM agent.
 */
export class GuardrailsService {
  /**
   * Validates user input using an LLM check.
   */
  static async validate(input: string): Promise<{ safe: boolean; reason?: string }> {
    try {
      const messages = [
        { role: 'system' as const, content: GUARDRAILS_PROMPT },
        { role: 'user' as const, content: input },
      ];

      // Use the fast model for low latency checks
      const response = (await PoeService.chat(messages, 'grok-4.1-fast-non-reasoning')) as ChatCompletion;
      const content = response.choices[0].message.content || '';

      const result = safeJsonParse<{ safe: boolean; reason: string | null }>(content);

      if (!result) {
        // Fallback: If JSON parsing fails, assume safe but log warning
        console.warn('Guardrails: Failed to parse JSON, assuming safe.');
        return { safe: true };
      }

      if (!result.safe) {
        return { safe: false, reason: result.reason || 'Yêu cầu không hợp lệ.' };
      }

      return { safe: true };
    } catch (error) {
      console.error('Guardrails Error:', error);
      // Fail open or closed? Here we fail open (allow) to not block users on API errors, 
      // but in high security, you might fail closed.
      return { safe: true };
    }
  }
}
