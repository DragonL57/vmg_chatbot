import { getFastProvider } from '@/lib/providers';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Service for LLM calls used in decomposition / planning.
 * Routes to Inception or POE based on LLM_PROVIDER env var.
 */
export class PoeService {
  /**
   * Generates a chat completion using the configured LLM provider.
   *
   * @param messages - Array of chat messages.
   * @param model - Override model (defaults to provider's fast model).
   * @param stream - Whether to stream the response (default: false).
   */
  static async chat(
    messages: ChatCompletionMessageParam[],
    model?: string,
    stream: boolean = false
  ) {
    const { client, model: defaultModel, extraBody } = getFastProvider();
    try {
      const response = await client.chat.completions.create({
        model: model ?? defaultModel,
        messages,
        stream,
        ...(extraBody ? { extra_body: extraBody } : {}),
      } as Parameters<typeof client.chat.completions.create>[0]);

      return response;
    } catch (error) {
      console.error('Error in PoeService.chat:', error);
      throw error;
    }
  }
}
