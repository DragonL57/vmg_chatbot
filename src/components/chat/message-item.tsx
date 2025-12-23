import React from 'react';
import { Message } from '@/types/chat';

interface MessageItemProps {
  message: Message;
}

/**
 * Individual message component that renders a single chat message.
 * Styles differ based on whether the message is from the user or the assistant.
 * 
 * @param {MessageItemProps} props - The component props
 * @param {Message} props.message - The message object to render
 * @returns {JSX.Element} The rendered message item
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm shadow-sm ${
          isUser
            ? 'bg-[#D32F2F] text-white rounded-br-none'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        <div
          className={`text-[10px] mt-1 opacity-70 ${
            isUser ? 'text-white' : 'text-gray-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
