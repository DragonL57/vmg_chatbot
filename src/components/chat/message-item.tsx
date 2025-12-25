import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { Database, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

/**
 * Individual message component that renders a single chat message.
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.isToolCall;
  const isSafetyWarning = message.content?.includes('⚠️ Cảnh báo vi phạm chính sách an toàn');
  const [showData, setShowData] = useState(false);

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center max-w-[90%] w-full">
          <button 
            onClick={() => isTool ? null : setShowData(!showData)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors shadow-sm ${
              isTool 
                ? 'bg-blue-50 border border-blue-100 text-blue-600' 
                : 'bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {isTool ? <Search className="w-3 h-3 animate-pulse" /> : <Database className="w-3 h-3 text-blue-500" />}
            {message.content}
            {!isTool && (showData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          
          {showData && message.leadData && (
            <div className="mt-2 w-full bg-slate-800 text-blue-300 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-60 overflow-y-auto shadow-inner border border-slate-700 animate-in slide-in-from-top-2 duration-300 custom-scrollbar">
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(message.leadData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative transition-all duration-700 ${
          isUser
            ? 'bg-[#D32F2F] text-white rounded-tr-sm'
            : isSafetyWarning
              ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-sm shadow-amber-100/50 italic font-medium'
              : `bg-white text-slate-700 border rounded-tl-sm shadow-slate-200/50 ${
                  message.isAmbiguous 
                    ? 'border-[#D32F2F]/60 shadow-[0_0_12px_rgba(211,47,47,0.25)]' 
                    : 'border-slate-200'
                }`
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
