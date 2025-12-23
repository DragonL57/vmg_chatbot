'use client';

import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { v4 as uuidv4 } from 'uuid';

/**
 * The main chat interface component for URASys.
 * Handles message state and streams backend responses manually.
 * 
 * @returns {JSX.Element} The rendered chat interface
 */
export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);

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
    setIsClarifying(false); // Reset clarification state for new message

    try {
      // Prepare messages for backend (exclude ID and timestamp)
      const apiMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Check for ambiguity header
      const ambiguousHeader = response.headers.get('X-URASys-Ambiguous');
      if (ambiguousHeader === 'true') {
        setIsClarifying(true);
      }

      // Initialize assistant message
      const assistantId = uuidv4();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantId 
              ? { ...msg, content: msg.content + chunkValue } 
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
      alert('An error occurred while sending your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-widest opacity-80">Unified Retrieval Agent-Based System</p>
              <a 
                href="https://openreview.net/pdf?id=AgntWJqRZG" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] bg-white/20 hover:bg-white/30 px-1 rounded transition-colors"
                title="Read the URASys Paper"
              >
                Paper 📄
              </a>
            </div>
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

      {/* Clarification Indicator */}
      {isClarifying && !isLoading && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-b border-yellow-100 flex items-center gap-2">
          <span className="text-yellow-600">💡</span>
          <p className="text-[11px] text-yellow-800 italic">
            Trợ lý cần thêm thông tin để trả lời chính xác nhất. Vui lòng phản hồi câu hỏi trên.
          </p>
        </div>
      )}

      {/* Chat Input */}
      <ChatInput 
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSendMessage}
        isLoading={isLoading} 
      />
      
      {/* Footer */}
      <footer className="bg-gray-50 text-[10px] text-gray-400 p-2 text-center border-t">
        &copy; 2025 VMG English Center. All rights reserved. Powered by URASys.
      </footer>
    </div>
  );
};
