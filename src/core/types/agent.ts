import { z } from 'zod';

/**
 * Schema for the Manager Agent's query decomposition output.
 */
export const QueryDecompositionSchema = z.object({
  reasoning: z.string().nullable().optional(),
  chitchat: z.boolean().nullable().optional(),
  subQueries: z.array(z.string()).nullable().optional(),
  is_clear: z.boolean().default(true),
  clarification_needed: z.string().nullable().optional(),
});

export type QueryDecomposition = z.infer<typeof QueryDecompositionSchema>;

