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
    address: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    // Study Abroad KYC Level 1
    studyAbroadIntent: z.string().nullable().optional(), // Nhu cầu/Thời gian dự kiến đi
    targetCountries: z.array(z.string()).nullable().optional(), // Quốc gia quan tâm
    educationLevel: z.array(z.string()).nullable().optional(), // Cấp bậc du học
    admissionTime: z.string().nullable().optional(), // Thời gian nhập học mong muốn
    majorOfInterest: z.array(z.string()).nullable().optional(), // Ngành học quan tâm
    sponsor: z.string().nullable().optional(), // Người tài trợ
    budget: z.string().nullable().optional(), // Mức chi phí dự kiến
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
