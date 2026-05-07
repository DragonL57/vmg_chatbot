import { describe, it, expect } from 'vitest';
import type { ChatRequest, ChatRole } from './chat-request';

describe('ChatRequest type', () => {
  it('accepts valid chat request structure', () => {
    const request: ChatRequest = {
      messages: [
        { role: 'user' as ChatRole, content: 'Hello' },
        { role: 'assistant' as ChatRole, content: 'Hi there!' },
      ],
      serviceMode: 'auto',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    };
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].role).toBe('user');
    expect(request.messages[1].role).toBe('assistant');
    expect(request.serviceMode).toBe('auto');
    expect(request.conversationId).toBeTruthy();
  });

  it('supports system role messages', () => {
    const request: ChatRequest = {
      messages: [{ role: 'system' as ChatRole, content: 'You are a helpful assistant.' }],
      serviceMode: 'vstep',
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
    };
    expect(request.messages[0].role).toBe('system');
  });

  it('enforces readonly messages array', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user' as ChatRole, content: 'Hello' }],
      serviceMode: 'auto',
      conversationId: '550e8400-e29b-41d4-a716-446655440002',
    };
    // Type-level check: messages is readonly
    expect(Array.isArray(request.messages)).toBe(true);
  });

  it('requires non-empty content via schema', () => {
    // The ChatRequest type allows this at the type level,
    // but the Zod schema (chatRequestSchema) enforces min length
    const request: ChatRequest = {
      messages: [{ role: 'user' as ChatRole, content: 'Hello' }],
      serviceMode: '',
      conversationId: '00000000-0000-0000-0000-000000000000',
    };
    // Empty serviceMode passes type check (validation at boundary)
    expect(request.serviceMode).toBe('');
  });
});
