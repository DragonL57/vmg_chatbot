'use client';

import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { useViewportHeight } from '@/hooks/use-viewport-height';
import { Info, Phone } from 'lucide-react';

/**
 * The main chat interface component for URASys.
 * Handles message state and streams backend responses manually.
 */
export const ChatInterface: React.FC = () => {
  useViewportHeight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      const apiMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
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

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        
        if (chunkValue) {
          if (!assistantId) {
            assistantId = uuidv4();
            const assistantMessage: Message = {
              id: assistantId,
              role: 'assistant',
              content: chunkValue,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === assistantId 
                  ? { ...msg, content: msg.content + chunkValue } 
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
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  return (
    <div 
      className="flex flex-col bg-slate-50 w-full mx-auto overflow-hidden fixed inset-0 md:relative"
      style={{ height: 'var(--vv-height, 100vh)' }}
    >
      {/* VMG Brand Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-11 w-11 flex items-center justify-center overflow-hidden">
              <Image src="/apple-icon.svg" alt="VMG Logo" width={36} height={36} className="object-contain" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-none mb-1">VMG English Center</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Tư vấn viên AI</p>
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
        <MessageList messages={messages} isLoading={isLoading} onSuggestionClick={onSuggestionClick} />
      </div>

      {/* Chat Input Area */}
      <div className="shrink-0 bg-white border-t border-slate-200">
        <ChatInput 
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSendMessage}
          isLoading={isLoading} 
        />
        <div className="px-4 pb-2 text-center">
           <p className="text-[9px] text-slate-400 font-medium">
             &copy; 2025 VMG English Center • Powered by URASys
           </p>
        </div>
      </div>
    </div>
  );
};