import { describe, it, expect } from 'vitest';
import { chatRequestSchema } from './chat-request-schema';

describe('chatRequestSchema', () => {
  it('accepts valid chat request', () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ],
      serviceMode: 'auto',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts system role messages', () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'Hello' },
      ],
      serviceMode: 'manual',
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty messages array', () => {
    const result = chatRequestSchema.safeParse({
      messages: [],
      serviceMode: 'auto',
      conversationId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('messages'))).toBe(true);
    }
  });

  it('rejects message with empty content', () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: 'user', content: '' }],
      serviceMode: 'auto',
      conversationId: '550e8400-e29b-41d4-a716-446655440003',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: 'invalid_role', content: 'Hello' }],
      serviceMode: 'auto',
      conversationId: '550e8400-e29b-41d4-a716-446655440004',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing serviceMode', () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: '550e8400-e29b-41d4-a716-446655440005',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID conversationId', () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'Hello' }],
      serviceMode: 'auto',
      conversationId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
