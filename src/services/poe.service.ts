import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Service for interacting with the POE API.
 */
export class PoeService {
  /**
   * Generates a chat completion using the POE API.
   * 
   * @param messages - Array of chat messages.
   * @param model - The model/bot handle to use (defaults to env.POE_BOT_NAME).
   * @param stream - Whether to stream the response (default: false).
   * @returns The completion response or a stream.
   */
  static async chat(
    messages: ChatCompletionMessageParam[],
    model: string = DEFAULT_POE_MODEL,
    stream: boolean = false
  ) {
    try {
      const response = await poe.chat.completions.create({
        model,
        messages,
        stream,
      });

      return response;
    } catch (error) {
      console.error('Error in PoeService.chat:', error);
      throw error;
    }
  }
}
