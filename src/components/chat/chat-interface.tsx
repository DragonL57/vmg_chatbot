'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Message } from '@core/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { v4 as uuidv4 } from 'uuid';
import { useViewportHeight } from '@/hooks/use-viewport-height';
import { Menu, Settings2, LayoutGrid } from 'lucide-react';
import { type KnowledgeCollection } from '@core/services/supabase.service';
import { toast } from 'sonner';
import { supabase } from '@/core/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

interface ChatInterfaceProps {
  onToggleSidebar?: () => void;
}

const ChatContent: React.FC<ChatInterfaceProps> = ({ onToggleSidebar }) => {
  useViewportHeight();
  const params = useParams();
  const router = useRouter();
  
  const [sessionId, setSessionId] = useState<string>(uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [agentReflections, setAgentReflections] = useState<string[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState('auto');
  const [user, setUser] = useState<any>(null);
  const [chatTitle, setChatTitle] = useState<string | undefined>(undefined);
  
  const lastSavedCountRef = useRef<number>(0);
  const prevSessionIdRef = useRef<string | null>((params?.id as string) || null);
  const isNewSessionLocalRef = useRef<boolean>(false);
  const reflectionsRef = useRef<string[]>([]);
  const tokenUsageRef = useRef<any>(null);

  // Sync session ID with URL
  useEffect(() => {
    const id = params?.id as string;
    if (id && id !== sessionId) setSessionId(id);
  }, [params?.id]);

  // Initial Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Reliable Load Logic
  useEffect(() => {
    const id = params?.id as string;
    if (id) {
      if (isNewSessionLocalRef.current) {
        isNewSessionLocalRef.current = false;
        setIsHistoryLoading(false);
        return;
      }
      setIsHistoryLoading(true);
      fetch(`/api/conversation/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.messages) {
            setMessages(data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            lastSavedCountRef.current = data.messages.length;
          }
        })
        .finally(() => setIsHistoryLoading(false));
    } else {
      setMessages([]);
      setSessionId(uuidv4());
      lastSavedCountRef.current = 0;
      setIsHistoryLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    fetch('/api/collections').then(r => r.json()).then(data => { if (Array.isArray(data)) setCollections(data); });
  }, []);

  const saveConversation = useCallback(async (msgs: Message[], title?: string, shouldRefreshSidebar: boolean = false) => {
    if (!user || msgs.length === 0) return;
    try {
      await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId, userId: user.id, title,
          messages: msgs.map(m => ({ 
            role: m.role, content: m.content, timestamp: m.timestamp,
            citations: m.citations, reasoningTrace: m.reasoningTrace, traceId: m.traceId
            // memoryUpdated is NOT saved, making it transient UI state
          })),
          tokenUsage: tokenUsageRef.current,
        }),
      });
      if (shouldRefreshSidebar) window.dispatchEvent(new CustomEvent('refresh-chat-history'));
    } catch (e) {}
  }, [sessionId, user]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMessage: Message = { id: uuidv4(), role: 'user', content: content.trim(), timestamp: new Date() };
    const assistantId = uuidv4();
    const isFirstMessage = messages.length === 0;
    
    setMessages(prev => [...prev, userMessage, {
      id: assistantId, 
      role: 'assistant', 
      content: '', 
      timestamp: new Date(), 
      reasoningTrace: [],
      memoryUpdated: false // Reset badge state for new message
    }]);

    setInput('');
    setIsLoading(true);
    setLoadingPhase('thinking');
    reflectionsRef.current = [];

    if (isFirstMessage && !params?.id) {
      isNewSessionLocalRef.current = true;
      router.replace(`/chat/${sessionId}`, { scroll: false });
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })), 
          serviceMode: selectedCollection,
          conversationId: sessionId
        }),
      });

      if (!response.ok) throw new Error('Chat failed');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let activeTraceId = '';

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'trace_id') {
              activeTraceId = data.value;
              // Link traceId to the assistant message immediately if it exists
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, traceId: activeTraceId } : m));
            }
            if (data.type === 'phase') {
              setLoadingPhase(data.value);
              if (data.reflection) {
                reflectionsRef.current = [...reflectionsRef.current, data.reflection];
                setAgentReflections([...reflectionsRef.current]);
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, reasoningTrace: reflectionsRef.current } : m));
              }
            }
            if (data.type === 'content') {
              fullContent += data.value;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent, traceId: activeTraceId } : m));
            }
            if (data.type === 'citations') {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, citations: data.value } : m));
            }
            if (data.type === 'tokens') tokenUsageRef.current = data.value;
            if (data.type === 'memory_update') {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, memoryUpdated: true } : m));
            }
          } catch {}
        }
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
      setMessages(prev => prev.filter(m => m.id !== assistantId || m.content !== ''));
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  useEffect(() => {
    if (!isLoading && messages.length > lastSavedCountRef.current && messages.some(m => m.role === 'assistant')) {
       // Force sidebar refresh on new messages or new sessions
       saveConversation(messages, chatTitle, true);
       lastSavedCountRef.current = messages.length;
    }
  }, [isLoading, messages, saveConversation]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  }, [input, sendMessage]);

  return (
    <div className="flex-1 flex flex-col relative bg-white min-h-0">
      <header className="bg-white border-b border-black/[0.06] px-4 h-[44px] flex items-center justify-between shrink-0">
        <button onClick={onToggleSidebar} className="p-2 md:hidden"><Menu className="w-5 h-5" /></button>
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-black/40" />
          <span className="text-sm font-medium text-black/60">Không gian</span>
        </div>
        <button className="p-2"><Settings2 className="w-5 h-5 text-black/40" /></button>
      </header>
      <div className="flex-1 flex flex-col min-h-0 relative">
        <MessageList 
          messages={messages} isLoading={isLoading} isHistoryLoading={isHistoryLoading}
          loadingPhase={loadingPhase} agentReflections={agentReflections}
          currentMode={selectedCollection} sessionId={sessionId} collections={collections}
          onCollectionSelect={setSelectedCollection} onSuggestionClick={sendMessage} 
        />
      </div>
      <div className="p-4 md:px-32 max-w-5xl mx-auto w-full shrink-0">
        <ChatInput 
          input={input} 
          handleInputChange={handleInputChange} 
          handleSubmit={handleFormSubmit} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = (props) => (
  <Suspense fallback={<div>Loading...</div>}><ChatContent {...props} /></Suspense>
);
