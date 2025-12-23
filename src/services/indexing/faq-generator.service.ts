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
Given a text chunk from an academic or administrative policy document, generate 3-5 high-quality Q&A pairs that a customer would likely ask.
The answer should be concise, helpful, and based STRICTLY on the provided text.
Respond ONLY in the following JSON format:
{
  "pairs": [
    { "question": "Question 1?", "answer": "Answer 1" },
    ...
  ]
}
`.trim();

  /**
   * Generates initial Q&A pairs from a chunk.
   */
  static async generate(chunk: string): Promise<{ question: string, answer: string }[]> {
    try {
      const messages = [
        { role: 'system' as const, content: this.GENERATOR_PROMPT },
        { role: 'user' as const, content: `Text Chunk:\n${chunk}` },
      ];

      const response = (await PoeService.chat(messages)) as ChatCompletion;
      const content = response.choices[0].message.content || '';
      
      const parsed = safeJsonParse<{ pairs: { question: string, answer: string }[] }>(content);
      return parsed?.pairs || [];
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
