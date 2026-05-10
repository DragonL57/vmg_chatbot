'use client';

import { useState, useRef, useCallback } from 'react';
import { Message } from '@core/types/chat';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { useAuthUser } from './use-auth-user';
import {
  useSessionId,
  useConversationHistory,
  useConversationSaver,
  useSendMessage,
  useAutoSaveConversation,
} from './use-chat.helpers';

export function useChat() {
  const params = useParams();
  const router = useRouter();
  const urlId = params?.id as string | undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [agentReflections, setAgentReflections] = useState<string[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const lastSavedCountRef = useRef<number>(0);
  const isNewSessionLocalRef = useRef<boolean>(false);
  const reflectionsRef = useRef<string[]>([]);
  const tokenUsageRef = useRef<unknown>(null);

  const user = useAuthUser();
  const { sessionId } = useSessionId(urlId);

  const handleHistoryError = useCallback(() => {
    toast.error('Không thể tải lịch sử');
  }, []);

  const handleStreamError = useCallback(() => {
    toast.error('Lỗi kết nối');
  }, []);

  useConversationHistory({
    urlId,
    setMessages,
    setIsHistoryLoading,
    lastSavedCountRef,
    isNewSessionLocalRef,
    onError: handleHistoryError,
  });

  const saveConversation = useConversationSaver(sessionId, user, tokenUsageRef);
  const sendMessage = useSendMessage({
    isLoading,
    messages,
    urlId,
    sessionId,
    router,
    setMessages,
    setInput,
    setIsLoading,
    setLoadingPhase,
    setAgentReflections,
    reflectionsRef,
    tokenUsageRef,
    isNewSessionLocalRef,
    onStreamError: handleStreamError,
  });
  useAutoSaveConversation(isLoading, messages, saveConversation, lastSavedCountRef);

  return {
    sessionId,
    messages,
    input,
    setInput,
    isLoading,
    loadingPhase,
    agentReflections,
    isHistoryLoading,
    sendMessage,
  };
}
