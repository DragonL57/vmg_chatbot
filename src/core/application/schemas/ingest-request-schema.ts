import { z } from 'zod';

export const ingestRequestSchema = z.object({
  storagePath: z.string()
    .min(1, 'storagePath is required')
    .regex(/^[\w\-./]+$/, 'Invalid storagePath pattern'),
  filename: z.string()
    .min(1, 'filename is required')
    .max(255, 'filename is too long'),
  mode: z.string()
    .min(1, 'mode (collection name) is required')
    .regex(/^[a-z0-9\-_]+$/, 'Mode must be lowercase, numbers, hyphens or underscores'),
  folder: z.string().optional(),
  fileId: z.string().uuid('fileId must be a valid UUID').optional(),
});
