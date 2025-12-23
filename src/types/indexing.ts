import { z } from 'zod';

/**
 * Schema for generated FAQs from a chunk.
 */
export const FAQGenerationSchema = z.object({
  questions: z.array(z.string()).min(1),
  reasoning: z.string().optional(),
});

export type FAQGeneration = z.infer<typeof FAQGenerationSchema>;

/**
 * Schema for expanded/paraphrased questions.
 */
export const FAQExpansionSchema = z.object({
  variations: z.array(z.string()).min(1),
});

export type FAQExpansion = z.infer<typeof FAQExpansionSchema>;
