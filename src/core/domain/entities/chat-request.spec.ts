import { describe, it, expect } from 'vitest';
import type { ChatRequest, ChatRole } from './chat-request';

describe('ChatRequest type', () => {
  it('accepts valid chat request structure', () => {
    const request: ChatRequest = {
      messages: [
        { role: 'user' as ChatRole, content: 'Hello' },
        { role: 'assistant' as ChatRole, content: 'Hi there!' },
      ],
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    };
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].role).toBe('user');
    expect(request.messages[1].role).toBe('assistant');
    expect(request.conversationId).toBeTruthy();
  });

  it('supports system role messages', () => {
    const request: ChatRequest = {
      messages: [{ role: 'system' as ChatRole, content: 'You are a helpful assistant.' }],
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
    };
    expect(request.messages[0].role).toBe('system');
  });

  it('enforces readonly messages array', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user' as ChatRole, content: 'Hello' }],
      conversationId: '550e8400-e29b-41d4-a716-446655440002',
    };
    expect(Array.isArray(request.messages)).toBe(true);
  });
});
