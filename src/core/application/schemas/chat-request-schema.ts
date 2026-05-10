import { z } from 'zod';

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Content cannot be empty'),
  })).min(1, 'Messages array must contain at least one message'),
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
});
