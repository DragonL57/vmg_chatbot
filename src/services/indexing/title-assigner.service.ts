import { PoeService } from '@/services/poe.service';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { TITLE_ASSIGNER_PROMPT } from '@/prompts/title-assigner';

/**
 * Service to assign descriptive, context-aware titles to text chunks.
 * This enhances retrieval by adding semantic meaning to otherwise context-less chunks.
 */
export class TitleAssignerService {
  /**
   * Generates a title for a text chunk using the LLM.
   * 
   * @param chunk - The text chunk content.
   * @returns The generated title string.
   */
  static async generateTitle(chunk: string): Promise<string> {
    try {
      const messages = [
        { role: 'system' as const, content: TITLE_ASSIGNER_PROMPT },
        { role: 'user' as const, content: `Text Chunk:\n${chunk}\n\nTitle:` },
      ];

      const response = (await PoeService.chat(messages)) as ChatCompletion;
      const title = response.choices[0].message.content?.trim() || 'Untitled Chunk';
      
      return title;
    } catch (error) {
      console.error('Error generating title for chunk:', error);
      return 'Untitled Chunk'; // Fallback
    }
  }
}