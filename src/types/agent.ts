import { z } from 'zod';

/**
 * Schema for the Manager Agent's query decomposition output.
 */
export const QueryDecompositionSchema = z.object({
  reasoning: z.string().nullable().optional(),
  chitchat: z.boolean().nullable().optional(),
  subQueries: z.array(z.string()).nullable().optional(),
  externalApiCall: z.object({
    api: z.enum(['college-scorecard']).nullable().optional(),
    parameters: z.record(z.string(), z.any()).nullable().optional(),
  }).nullable().optional(),
});

export type QueryDecomposition = z.infer<typeof QueryDecompositionSchema>;

