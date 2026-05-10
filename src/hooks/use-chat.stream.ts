'use client';

import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@core/types/chat';

type StreamHandler = {
  assistantId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setLoadingPhase: Dispatch<SetStateAction<string>>;
  setAgentReflections: Dispatch<SetStateAction<string[]>>;
  reflectionsRef: MutableRefObject<string[]>;
  tokenUsageRef: MutableRefObject<unknown>;
};

export const createUserMessage = (content: string): Message => ({
  id: uuidv4(),
  role: 'user',
  content: content.trim(),
  timestamp: new Date(),
});

export const createAssistantMessage = (assistantId: string): Message => ({
  id: assistantId,
  role: 'assistant',
  content: '',
  timestamp: new Date(),
  reasoningTrace: [],
  memoryUpdated: false,
});

const updateAssistantMessage = (
  setMessages: Dispatch<SetStateAction<Message[]>>,
  assistantId: string,
  update: (message: Message) => Message
) => {
  setMessages(prev => prev.map(m => (m.id === assistantId ? update(m) : m)));
};

const parseStreamLine = (
  line: string,
  state: { fullContent: string; activeTraceId: string },
  handler: StreamHandler
) => {
  const data = JSON.parse(line);
  if (data.type === 'trace_id') {
    state.activeTraceId = data.value;
    updateAssistantMessage(handler.setMessages, handler.assistantId, m => ({
      ...m,
      traceId: state.activeTraceId,
    }));
  }
  if (data.type === 'phase') {
    handler.setLoadingPhase(data.value);
    if (data.reflection) {
      handler.reflectionsRef.current = [...handler.reflectionsRef.current, data.reflection];
      handler.setAgentReflections([...handler.reflectionsRef.current]);
      updateAssistantMessage(handler.setMessages, handler.assistantId, m => ({
        ...m,
        reasoningTrace: handler.reflectionsRef.current,
      }));
    }
  }
  if (data.type === 'content') {
    state.fullContent += data.value;
    updateAssistantMessage(handler.setMessages, handler.assistantId, m => ({
      ...m,
      content: state.fullContent,
      traceId: state.activeTraceId,
    }));
  }
  if (data.type === 'tokens') handler.tokenUsageRef.current = data.value;
  if (data.type === 'memory_update') {
    updateAssistantMessage(handler.setMessages, handler.assistantId, m => ({
      ...m,
      memoryUpdated: true,
    }));
  }
};

export const streamChatResponse = async (response: Response, handler: StreamHandler) => {
  if (!response.ok) throw new Error('Chat failed');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader');

  const decoder = new TextDecoder();
  const state = { fullContent: '', activeTraceId: '' };
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    // Use { stream: true } to handle multi-byte characters split across chunks
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Keep the last part (could be a partial JSON line) in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        parseStreamLine(line, state, handler);
      } catch (err) {
        console.warn('[Stream] Parse error for line:', line, err);
      }
    }
  }

  // Handle any remaining content in the buffer after the stream ends
  if (buffer.trim()) {
    try {
      parseStreamLine(buffer, state, handler);
    } catch (err) {
      console.warn('[Stream] Final parse error:', buffer, err);
    }
  }
};

export const fetchChatResponse = (payload: {
  messages: Array<{ role: string; content: string }>;
  conversationId: string;
}) =>
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
