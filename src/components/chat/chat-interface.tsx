'use client';

import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { v4 as uuidv4 } from 'uuid';

/**
 * The main chat interface component for URASys.
 * Handles message state, simulates backend responses (for now),
 * and coordinates the message list and input components.
 * 
 * @returns {JSX.Element} The rendered chat interface
 */
export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Set loading for assistant response
    setIsLoading(true);

    // TODO: Integrate with actual backend in next task
    // For now, simulate a response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Cảm ơn bạn đã quan tâm. Tôi là trợ lý ảo của VMG English Center. Tôi đã nhận được câu hỏi: "${content}". Tính năng trả lời tự động đang được tích hợp.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-4xl mx-auto shadow-2xl">
      {/* VMG Header */}
      <header className="bg-[#D32F2F] text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-full text-[#D32F2F] font-bold text-xl h-10 w-10 flex items-center justify-center">
            V
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold leading-tight">VMG English Center</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Unified Retrieval Agent-Based System</p>
          </div>
        </div>
        <div className="text-white opacity-80">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
      </header>

      {/* Message List */}
      <MessageList messages={messages} />

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      
      {/* Footer */}
      <footer className="bg-gray-50 text-[10px] text-gray-400 p-2 text-center border-t">
        &copy; 2025 VMG English Center. All rights reserved. Powered by URASys.
      </footer>
    </div>
  );
};
