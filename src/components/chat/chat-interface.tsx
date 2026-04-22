'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@core/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { Sidebar } from '../layout/Sidebar';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { useViewportHeight } from '@/hooks/use-viewport-height';
import { Menu, Settings2, Info, LayoutGrid } from 'lucide-react';
import { LocationData } from './location-modal';
import { type KnowledgeCollection } from '@core/services/supabase.service';
import { toast } from 'sonner';

export const ChatInterface: React.FC = () => {
  useViewportHeight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState('auto');

  const sessionIdRef = useRef<string>(uuidv4());
  const sessionId = sessionIdRef.current;
  const tokenUsageRef = useRef<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | null>(null);
  const [phaseDetail, setPhaseDetail] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/collections')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCollections(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((data) => {
        setLocation({
          latitude: data.latitude, longitude: data.longitude,
          accuracy: null, city: data.city ?? null,
          region: data.region ?? null, country: data.country_name ?? null,
        });
      })
      .catch(() => {});
  }, []);

  const saveConversation = useCallback(async (msgs: Message[]) => {
    try {
      await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: msgs.filter(m => !m.isToolCall).map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          location, tokenUsage: tokenUsageRef.current,
        }),
      });
    } catch (e) {}
  }, [sessionId, location]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = { id: uuidv4(), role: 'user', content: content.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLoadingPhase('decompose');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })), serviceMode: selectedCollection }),
      });
      if (!response.ok) throw new Error('Chat failed');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantId = '';
      let streamBuffer = ''; 
      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'phase') { setLoadingPhase(data.value); setPhaseDetail(data.detail || ''); }
            else if (data.type === 'tokens') { tokenUsageRef.current = data.value; }
            else if (data.type === 'content') {
              const text = data.value;
              if (!assistantId) {
                setLoadingPhase('');
                assistantId = uuidv4();
                setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: text, timestamp: new Date() }]);
              } else {
                setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, content: msg.content + text } : msg));
              }
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      toast.error('Lỗi kết nối với máy chủ trợ lý.');
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  useEffect(() => {
    if (!isLoading && messages.some(m => m.role === 'assistant')) saveConversation(messages);
  }, [isLoading, messages, saveConversation]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col relative transition-all duration-300 md:ml-[240px]">
        {/* ZaUI Native Header (44px + Safe Area) */}
        <header 
          className="bg-white shrink-0 z-30 border-b border-black/[0.06] px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 24px)' }}
        >
          <div className="h-[44px] flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <button onClick={() => setIsSidebarOpen(true)} className="p-1 -ml-1 text-black/40 md:hidden hover:bg-black/5 rounded">
                <Menu className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <Image src="/apple-icon.svg" alt="VMG" width={24} height={24} />
                </div>
                <h1 className="text-[17px] font-semibold text-black/80 truncate">VMG MATE</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="h-8 px-3 text-[13px] font-medium text-black/50 hover:bg-black/5 rounded transition-all flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4" strokeWidth={1.5} /> Không gian
              </button>
              <div className="w-px h-4 bg-black/[0.08] mx-1"></div>
              <button className="p-2 text-black/40 hover:bg-black/5 rounded transition-colors"><Settings2 className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
          </div>
        </header>

        {/* Dynamic App Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-[#f6f5f4]">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            loadingPhase={loadingPhase}
            phaseDetail={phaseDetail}
            currentMode={selectedCollection}
            sessionId={sessionId}
            collections={collections}
            onCollectionSelect={setSelectedCollection}
            onSuggestionClick={(t) => sendMessage(t)} 
          />
        </div>

        {/* Focused Input Bar (Tightened & Floating) */}
        <div className="shrink-0 bg-transparent px-4 md:px-16 lg:px-32 pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <div className="max-w-4xl mx-auto">
            <ChatInput
              input={input}
              handleInputChange={(e) => setInput(e.target.value)}
              handleSubmit={(e) => { e.preventDefault(); if(input.trim()) sendMessage(input); }}
              isLoading={isLoading}
            />
            <div className="mt-2 flex justify-center px-4">
              <p className="text-[11px] text-[#a39e98] text-center leading-none">
                Kiểm tra lại thông tin, MATE có thể nhầm lẫn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
