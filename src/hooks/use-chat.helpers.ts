'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { Message } from '@core/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { type KnowledgeCollection } from '@core/application/ports/knowledge-repository.port';
import { supabase } from '@/core/lib/supabase';
import { type User } from '@supabase/supabase-js';
import {
  createUserMessage,
  createAssistantMessage,
  streamChatResponse,
  fetchChatResponse,
} from './use-chat.stream';

type RouterLike = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

type ConversationHistoryParams = {
  urlId: string | undefined;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsHistoryLoading: Dispatch<SetStateAction<boolean>>;
  lastSavedCountRef: MutableRefObject<number>;
  isNewSessionLocalRef: MutableRefObject<boolean>;
  onError: () => void;
};

type SendMessageParams = {
  isLoading: boolean;
  messages: Message[];
  urlId: string | undefined;
  sessionId: string;
  selectedCollection: string;
  router: RouterLike;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setInput: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingPhase: Dispatch<SetStateAction<string>>;
  setAgentReflections: Dispatch<SetStateAction<string[]>>;
  reflectionsRef: MutableRefObject<string[]>;
  tokenUsageRef: MutableRefObject<unknown>;
  isNewSessionLocalRef: MutableRefObject<boolean>;
  onStreamError: () => void;
};

export const useAuthUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return user;
};

export const useCollections = () => {
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState('auto');

  useEffect(() => {
    fetch('/api/collections')
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.collections)) setCollections(data.collections);
      })
      .catch(() => {})
      .finally(() => setIsCollectionsLoading(false));
  }, []);

  return { collections, isCollectionsLoading, selectedCollection, setSelectedCollection };
};

export const useSessionId = (urlId?: string) => {
  const [localSessionId, setLocalSessionId] = useState<string>(() => uuidv4());

  useEffect(() => {
    if (!urlId) {
      queueMicrotask(() => setLocalSessionId(uuidv4()));
    }
  }, [urlId]);

  return { sessionId: urlId ?? localSessionId, setLocalSessionId };
};

export const useConversationHistory = ({
  urlId,
  setMessages,
  setIsHistoryLoading,
  lastSavedCountRef,
  isNewSessionLocalRef,
  onError,
}: ConversationHistoryParams) => {
  useEffect(() => {
    if (!urlId) {
      queueMicrotask(() => {
        setMessages([]);
        lastSavedCountRef.current = 0;
        setIsHistoryLoading(false);
      });
      return;
    }

    if (isNewSessionLocalRef.current) {
      isNewSessionLocalRef.current = false;
      queueMicrotask(() => setIsHistoryLoading(false));
      return;
    }

    queueMicrotask(() => setIsHistoryLoading(true));
    fetch(`/api/conversation/${urlId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.messages) {
          setMessages(
            data.messages.map((m: { timestamp: string | number | Date }) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
          lastSavedCountRef.current = data.messages.length;
        }
      })
      .catch(onError)
      .finally(() => setIsHistoryLoading(false));
  }, [urlId, setMessages, setIsHistoryLoading, lastSavedCountRef, isNewSessionLocalRef, onError]);
};

export const useConversationSaver = (
  sessionId: string,
  user: User | null,
  tokenUsageRef: MutableRefObject<unknown>
) =>
  useCallback(
    async (msgs: Message[]) => {
      if (!user || msgs.length === 0) return;
      try {
        await fetch('/api/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionId,
            userId: user.id,
            messages: msgs.map(m => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              reasoningTrace: m.reasoningTrace,
              traceId: m.traceId,
            })),
            tokenUsage: tokenUsageRef.current,
          }),
        });
        window.dispatchEvent(new CustomEvent('refresh-chat-history'));
      } catch {
        // Ignore background save errors
      }
    },
    [sessionId, user, tokenUsageRef]
  );

export const useSendMessage = ({
  isLoading,
  messages,
  urlId,
  sessionId,
  selectedCollection,
  router,
  setMessages,
  setInput,
  setIsLoading,
  setLoadingPhase,
  setAgentReflections,
  reflectionsRef,
  tokenUsageRef,
  isNewSessionLocalRef,
  onStreamError,
}: SendMessageParams) =>
  useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage = createUserMessage(content);
      const assistantId = uuidv4();
      const isFirstMessage = messages.length === 0;

      setMessages(prev => [...prev, userMessage, createAssistantMessage(assistantId)]);
      setInput('');
      setIsLoading(true);
      setLoadingPhase('thinking');
      reflectionsRef.current = [];

      if (isFirstMessage && !urlId) {
        isNewSessionLocalRef.current = true;
        router.replace(`/chat/${sessionId}`, { scroll: false });
      }

      try {
        const response = await fetchChatResponse({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          serviceMode: selectedCollection,
          conversationId: sessionId,
        });
        await streamChatResponse(response, {
          assistantId,
          setMessages,
          setLoadingPhase,
          setAgentReflections,
          reflectionsRef,
          tokenUsageRef,
        });
      } catch {
        onStreamError();
        setMessages(prev => prev.filter(m => m.id !== assistantId || m.content !== ''));
      } finally {
        setIsLoading(false);
        setLoadingPhase('');
      }
    },
    [
      isLoading,
      messages,
      urlId,
      sessionId,
      selectedCollection,
      router,
      setMessages,
      setInput,
      setIsLoading,
      setLoadingPhase,
      setAgentReflections,
      reflectionsRef,
      tokenUsageRef,
      isNewSessionLocalRef,
      onStreamError,
    ]
  );

export const useAutoSaveConversation = (
  isLoading: boolean,
  messages: Message[],
  saveConversation: (msgs: Message[]) => Promise<void>,
  lastSavedCountRef: MutableRefObject<number>
) => {
  useEffect(() => {
    if (!isLoading && messages.length > lastSavedCountRef.current && messages.some(m => m.role === 'assistant')) {
      saveConversation(messages);
      lastSavedCountRef.current = messages.length;
    }
  }, [isLoading, messages, saveConversation, lastSavedCountRef]);
};
