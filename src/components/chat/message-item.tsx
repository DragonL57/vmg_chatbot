import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';

interface MessageItemProps {
  message: Message;
}

/**
 * Individual message component that renders a single chat message.
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative ${
          isUser
            ? 'bg-[#D32F2F] text-white rounded-tr-sm'
            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-slate-200/50'
        }`}
      >
        <div className="leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="m-0 mb-1.5 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 m-0 mb-1.5 last:mb-0 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 m-0 mb-1.5 last:mb-0 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="m-0 p-0">{children}</li>,
              strong: ({ children }) => <span className="font-bold text-inherit">{children}</span>,
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`underline font-medium underline-offset-2 ${isUser ? 'text-white' : 'text-[#D32F2F]'}`}
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3 -mx-1">
                  <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100 last:border-0">
                  {children}
                </td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <div
          className={`text-[9px] mt-1.5 font-medium flex items-center gap-1 ${
            isUser ? 'text-white/70' : 'text-slate-400'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isUser && <span className="text-[8px]">✓</span>}
        </div>
      </div>
    </div>
  );
};
