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

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        parseStreamLine(line, state, handler);
      } catch {
        // Ignore parse errors for partial chunks
      }
    }
  }
};

export const fetchChatResponse = (payload: {
  messages: Array<{ role: string; content: string }>;
  serviceMode: string;
  conversationId: string;
}) =>
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
