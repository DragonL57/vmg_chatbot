import { z } from 'zod';

export const memoryCategorySchema = z.enum(['persona', 'preference', 'entity', 'episodic', 'general']);

export const memoryActionSchema = z.object({
  op: z.enum(['ADD', 'UPDATE', 'DELETE']),
  fact: z.string().optional(),
  category: memoryCategorySchema.optional(),
  id: z.string().uuid().optional(),
});

export const memoryExtractionSchema = z.object({
  actions: z.array(memoryActionSchema),
});
