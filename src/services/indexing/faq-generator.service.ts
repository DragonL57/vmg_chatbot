import { PoeService } from '@/services/poe.service';
import { FAQGenerationSchema, FAQExpansionSchema } from '@/types/indexing';
import { safeJsonParse } from '@/lib/utils';
import { ChatCompletion } from 'openai/resources/chat/completions';

/**
 * Service to generate and expand FAQs from text chunks (Ask-and-Augment strategy).
 */
export class FAQGeneratorService {
  private static readonly GENERATOR_PROMPT = `
You are an expert at creating FAQ banks for English centers.
Given a text chunk from an academic or administrative policy document, generate 3-5 clear, concise questions that this chunk answers directly.
Respond ONLY in the following JSON format:
{
  "questions": ["Question 1?", "Question 2?", ...]
}
`.trim();

  private static readonly EXPANDER_PROMPT = `
You are an expert in linguistics and search optimization.
Given a list of questions, generate 2-3 paraphrased variations for each question to increase semantic search coverage.
The variations should use different synonyms or sentence structures but keep the same meaning.
Respond ONLY in the following JSON format:
{
  "variations": ["Variation 1", "Variation 2", ...]
}
`.trim();

  /**
   * Generates initial questions from a chunk.
   */
  static async generate(chunk: string): Promise<string[]> {
    try {
      const messages = [
        { role: 'system' as const, content: this.GENERATOR_PROMPT },
        { role: 'user' as const, content: `Text Chunk:\n${chunk}` },
      ];

      const response = (await PoeService.chat(messages)) as ChatCompletion;
      const content = response.choices[0].message.content || '';
      
      const parsed = safeJsonParse<{ questions: string[] }>(content);
      const result = FAQGenerationSchema.safeParse(parsed);
      
      return result.success ? result.data.questions : [];
    } catch (error) {
      console.error('Error generating FAQs:', error);
      return [];
    }
  }

  /**
   * Expands a list of questions with paraphrased variations.
   */
  static async expand(questions: string[]): Promise<string[]> {
    if (questions.length === 0) return [];
    
    try {
      const messages = [
        { role: 'system' as const, content: this.EXPANDER_PROMPT },
        { role: 'user' as const, content: `Questions:\n${questions.join('\n')}` },
      ];

      const response = (await PoeService.chat(messages)) as ChatCompletion;
      const content = response.choices[0].message.content || '';
      
      const parsed = safeJsonParse<{ variations: string[] }>(content);
      const result = FAQExpansionSchema.safeParse(parsed);
      
      return result.success ? result.data.variations : [];
    } catch (error) {
      console.error('Error expanding FAQs:', error);
      return [];
    }
  }
}
