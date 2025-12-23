import { PoeService } from '@/services/poe.service';
import { ChatCompletion } from 'openai/resources/chat/completions';

/**
 * Service to assign descriptive, context-aware titles to text chunks.
 * This enhances retrieval by adding semantic meaning to otherwise context-less chunks.
 */
export class TitleAssignerService {
  private static readonly SYSTEM_PROMPT = `
You are a helpful assistant for a RAG system at VMG English Center.
Your task is to generate a concise, descriptive title (in the same language as the text) for the provided text chunk.
The title should summarize the main topic or policy described in the chunk.
Do not use quotes. Just output the title.
`.trim();

  /**
   * Generates a title for a text chunk using the LLM.
   * 
   * @param chunk - The text chunk content.
   * @returns The generated title string.
   */
  static async generateTitle(chunk: string): Promise<string> {
    try {
      const messages = [
        { role: 'system' as const, content: this.SYSTEM_PROMPT },
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