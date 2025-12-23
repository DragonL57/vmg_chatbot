import React, { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { MessageItem } from './message-item';

interface MessageListProps {
  messages: Message[];
}

/**
 * Component that displays a list of chat messages.
 * Automatically scrolls to the bottom when new messages are added.
 * 
 * @param {MessageListProps} props - The component props
 * @param {Message[]} props.messages - Array of messages to display
 * @returns {JSX.Element} The rendered message list
 */
export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 scroll-smooth"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
          <div className="text-4xl">📚</div>
          <p className="text-sm italic font-serif">Chào mừng bạn đến với VMG English Center!</p>
          <p className="text-xs">Tôi có thể giúp gì cho bạn về các quy định và khóa học?</p>
        </div>
      ) : (
        messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
      )}
    </div>
  );
};
