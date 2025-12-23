'use client';

import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { v4 as uuidv4 } from 'uuid';
import { useViewportHeight } from '@/hooks/use-viewport-height';
import { Info, MessageSquare, Phone, GraduationCap } from 'lucide-react';

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

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
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

      // Check for ambiguity header
      const ambiguousHeader = response.headers.get('X-URASys-Ambiguous');
      
      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantId = '';
      let fullContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        
        if (chunkValue) {
          fullContent += chunkValue;
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

      // If ambiguous, append the clarification reminder
      if (ambiguousHeader === 'true') {
        const reminderId = uuidv4();
        const reminderMessage: Message = {
          id: reminderId,
          role: 'assistant',
          content: 'Dạ, bạn vui lòng phản hồi câu hỏi phía trên để mình tư vấn chính xác nhất nhé 😊',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, reminderMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col bg-slate-50 w-full mx-auto overflow-hidden"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* VMG Brand Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-11 w-11 flex items-center justify-center overflow-hidden">
              <img src="/apple-icon.svg" alt="VMG Logo" className="h-9 w-9 object-contain" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-none mb-1">VMG English Center</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Tư vấn viên AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.location.href = 'tel:1900636838'}
             className="p-2 text-slate-400 hover:text-[#D32F2F] transition-colors"
             title="Gọi Hotline"
           >
             <Phone className="w-5 h-5" />
           </button>
           <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
             <Info className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Message List Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <MessageList messages={messages} isLoading={isLoading} />
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
