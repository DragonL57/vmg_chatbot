'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@core/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { Sidebar } from '../layout/Sidebar';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { useViewportHeight } from '@/hooks/use-viewport-height';
import { Info, Phone, Menu, BookOpen } from 'lucide-react';
import { LocationData } from './location-modal';

/**
 * The main chat interface component for URASys.
 * Handles message state and streams backend responses manually.
 */
export const ChatInterface: React.FC = () => {
  useViewportHeight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());
  const sessionId = sessionIdRef.current;
  const tokenUsageRef = useRef<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | null>(null);

  // Silently fetch IP-based location on mount — no browser prompt needed
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((data) => {
        setLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: null,
          city: data.city ?? null,
          region: data.region ?? null,
          country: data.country_name ?? null,
        });
      })
      .catch(() => {}); // non-fatal
  }, []);

  const saveConversation = async (msgs: Message[]) => {
    try {
      await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: msgs
            .filter(m => !m.isToolCall)
            .map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          location,
          tokenUsage: tokenUsageRef.current,
        }),
      });
    } catch (e) {
      console.warn('[Conversation] save failed:', e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const onSuggestionClick = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
  };

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLoadingPhase('decompose');

    try {
      const apiMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: apiMessages,
          serviceMode: 'wiki'
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No response body');

      const ambiguousHeader = response.headers.get('X-URASys-Ambiguous');
      const leadDataHeader = response.headers.get('X-Lead-Data');

      if (leadDataHeader) {
        try {
          const decodedData = JSON.parse(Buffer.from(leadDataHeader, 'base64').toString());
          const leadMessage: Message = {
            id: uuidv4(),
            role: 'system',
            content: 'Đã cập nhật dữ liệu khách hàng vào hệ thống VMG CRM (Mock)',
            timestamp: new Date(),
            leadData: decodedData
          };
          setMessages((prev) => [...prev, leadMessage]);
        } catch (e) {
          console.error('Failed to parse lead data header', e);
        }
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantId = '';
      let toolCallMessageId = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        
        if (chunkValue) {
          // Phase signals
          if (chunkValue.includes('__PHASE__:decompose')) { setLoadingPhase('decompose'); continue; }
          if (chunkValue.includes('__PHASE__:search'))   { setLoadingPhase('search');   continue; }

          // Token usage signal — may arrive appended to last content chunk, strip it out
          let cleanChunk = chunkValue;
          const tokenMatch = chunkValue.match(/__TOKENS__:(\d+):(\d+):(\d+)/);
          if (tokenMatch) {
            tokenUsageRef.current = {
              prompt_tokens: parseInt(tokenMatch[1], 10),
              completion_tokens: parseInt(tokenMatch[2], 10),
              total_tokens: parseInt(tokenMatch[3], 10),
            };
            cleanChunk = chunkValue.replace(/__TOKENS__:\d+:\d+:\d+/, '').trimEnd();
            if (!cleanChunk) continue;
          }

          // Check for Tool Call signals
          if (chunkValue.includes('__TOOL_CALL_START__')) {
            toolCallMessageId = uuidv4();
            const toolMessage: Message = {
              id: toolCallMessageId,
              role: 'system',
              content: 'Chuyên viên đang truy xuất dữ liệu từ hệ thống giáo dục Mỹ...',
              timestamp: new Date(),
              isToolCall: true
            };
            setMessages((prev) => [...prev, toolMessage]);
            continue;
          }

          if (chunkValue.includes('__TOOL_CALL_DONE__')) {
            // We could update the message or just let it stay. 
            // Let's update it to "Đã hoàn tất truy xuất"
            if (toolCallMessageId) {
              setMessages((prev) => 
                prev.map(msg => msg.id === toolCallMessageId ? { ...msg, content: 'Đã hoàn tất truy xuất dữ liệu từ College Scorecard' } : msg)
              );
            }
            continue;
          }

          // Normal content streaming
          if (!assistantId) {
            assistantId = uuidv4();
            const assistantMessage: Message = {
              id: assistantId,
              role: 'assistant',
              content: cleanChunk,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === assistantId 
                  ? { ...msg, content: msg.content + cleanChunk } 
                  : msg
              )
            );
          }
        }
      }

      if (ambiguousHeader === 'true' && assistantId) {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantId 
              ? { ...msg, isAmbiguous: true } 
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  // Save after each completed assistant response
  useEffect(() => {
    if (!isLoading && messages.some(m => m.role === 'assistant')) {
      saveConversation(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  return (
    <div 
      className="flex flex-row bg-slate-50 w-full mx-auto overflow-hidden fixed inset-0"
      style={{ height: 'var(--vv-height, 100vh)' }}
    >
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <div className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}>
        {/* VMG Brand Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-opacity ${isSidebarOpen ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden xs:block">
              <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-11 w-11 flex items-center justify-center overflow-hidden">
                <Image src="/apple-icon.svg" alt="VMG Logo" width={36} height={36} className="object-contain" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-none mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#D32F2F]" />
                Wiki VMG
              </h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Cơ sở tri thức nội bộ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="tel:1900636838"
              className="p-2 text-slate-400 hover:text-[#D32F2F] transition-colors"
              title="Gọi Hotline"
            >
              <Phone className="w-5 h-5" />
            </a>
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Message List Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            loadingPhase={loadingPhase}
            currentMode="wiki"
            sessionId={sessionId}
            onSuggestionClick={onSuggestionClick} 
          />
        </div>

        {/* Chat Input Area */}
        <div className="shrink-0 bg-white border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSendMessage}
            isLoading={isLoading}
          />
          <div className="px-4 pb-2 text-center">
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
              &copy; 2025 VMG English Center
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
