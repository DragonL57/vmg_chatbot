import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
        <div className="leading-normal">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="m-0 mb-1 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 m-0 mb-1 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 m-0 mb-1 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="m-0 p-0 mb-0.5 last:mb-0">{children}</li>,
              strong: ({ children }) => <span className="font-bold">{children}</span>,
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`underline ${isUser ? 'text-white' : 'text-[#D32F2F]'}`}
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-b border-gray-300">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-sm text-gray-700 border-b border-gray-200">
                  {children}
                </td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
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
