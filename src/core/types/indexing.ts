import { z } from 'zod';

/**
 * Schema for generated FAQs from a chunk.
 */
export const FAQGenerationSchema = z.object({
  pairs: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).min(1),
});

export type FAQGeneration = z.infer<typeof FAQGenerationSchema>;

/**
 * Schema for expanded/paraphrased questions.
 */
export const FAQExpansionSchema = z.object({
  variations: z.array(z.string()).min(1),
});

export type FAQExpansion = z.infer<typeof FAQExpansionSchema>;
