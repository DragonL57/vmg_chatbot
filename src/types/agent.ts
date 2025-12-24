import { z } from 'zod';

/**
 * Schema for the Manager Agent's query decomposition output.
 */
export const QueryDecompositionSchema = z.object({
  isAmbiguous: z.boolean(),
  isSafe: z.boolean().default(true),
  canAnswerFromStatic: z.boolean().default(false),
  safetyReason: z.string().nullable().optional(),
  clarificationQuestion: z.string().nullable().optional(),
  subQueries: z.array(z.string()),
  reasoning: z.string(),
  extractedLead: z.object({
    name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    childName: z.string().nullable().optional(),
    childDob: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }).nullable().optional(),
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
