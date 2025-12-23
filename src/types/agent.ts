import { z } from 'zod';

/**
 * Schema for the Manager Agent's query decomposition output.
 */
export const QueryDecompositionSchema = z.object({
  isAmbiguous: z.boolean(),
  clarificationQuestion: z.string().optional(),
  subQueries: z.array(z.string()).min(1),
  reasoning: z.string(),
});

export type QueryDecomposition = z.infer<typeof QueryDecompositionSchema>;

/**
 * Schema for search results.
 */
export const SearchResultSchema = z.object({
  content: z.string(),
  source: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
