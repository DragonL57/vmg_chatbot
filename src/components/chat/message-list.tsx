import React, { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { MessageItem } from './message-item';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="bg-white border border-gray-200 rounded-lg rounded-bl-none px-4 py-3 shadow-sm">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  </div>
);

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const showTyping = isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user');

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 scroll-smooth"
    >
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
          <div className="text-4xl">📚</div>
          <p className="text-sm font-sans font-medium text-gray-600">Chào mừng bạn đến với VMG English Center!</p>
          <p className="text-xs">Tôi có thể giúp gì cho bạn về các quy định và khóa học?</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            msg.content ? <MessageItem key={msg.id} message={msg} /> : null
          ))}
          {showTyping && <TypingIndicator />}
        </>
      )}
    </div>
  );
};
