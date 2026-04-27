import { z } from 'zod';

export const memoryCategorySchema = z.enum(['persona', 'preference', 'entity', 'episodic', 'general']);
export type MemoryCategory = z.infer<typeof memoryCategorySchema>;

export interface UserMemory {
  readonly id: string;
  readonly userId: string;
  readonly fact: string;
  readonly category: MemoryCategory;
  readonly createdAt: Date;
}

export const memoryActionSchema = z.object({
  op: z.enum(['ADD', 'UPDATE', 'DELETE']),
  fact: z.string().optional(),
  category: memoryCategorySchema.optional(),
  id: z.string().uuid().optional()
});

export type MemoryAction = z.infer<typeof memoryActionSchema>;

export const memoryExtractionSchema = z.object({
  actions: z.array(memoryActionSchema)
});

export type MemoryExtraction = z.infer<typeof memoryExtractionSchema>;
