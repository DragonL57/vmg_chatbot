import { z } from "zod";

export const queryAnalysisSchema = z.object({
  is_clear: z.boolean().describe("Indicates if the user's question is clear and unambiguous."),
  questions: z.array(z.string()).describe("List of rewritten, self-contained questions if clear."),
  clarification_needed: z.string().optional().describe("Explanation or question for the user if the query is unclear.")
});

export type QueryAnalysis = z.infer<typeof queryAnalysisSchema>;
