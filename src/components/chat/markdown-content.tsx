import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BookOpen, X } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
  citations?: Record<string, string>;
}

/**
 * Enhanced Markdown Content with Citation Support and Interactive Previews
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isUser, citations = {} }) => {
  const [activeCitation, setActiveCitation] = useState<{ name: string; content: string } | null>(null);

  // Helper to render text with citation badges
  const renderWithCitations = (text: string) => {
    if (typeof text !== 'string') return text;

    // Matches: [Nguồn: file], [Source: file], Nguồn: [file], Source: [file]
    const citationRegex = /(?:\[(?:Nguồn|Source):\s*(.*?)\]|(?:Nguồn|Source):\s*\[(.*?)\])/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // The filename could be in either capture group 1 or 2
      const sourceName = (match[1] || match[2] || '').trim();
      const sourceContent = citations[sourceName];
      
      // Add citation badge
      parts.push(
        <span key={match.index} className="inline-block mx-0.5 align-middle select-none">
          <Tooltip content={sourceContent ? "Xem đoạn trích" : `Nguồn: ${sourceName}`}>
            <button 
              onClick={() => sourceContent && setActiveCitation({ name: sourceName, content: sourceContent })}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.08] rounded text-[10px] font-bold text-black/50 transition-colors group ${sourceContent ? 'cursor-pointer active:scale-95' : 'cursor-help'}`}
            >
              <BookOpen className={`w-3 h-3 transition-colors ${sourceContent ? 'text-[#D32F2F]' : 'text-black/30'}`} />
              <span className="whitespace-nowrap">{sourceName}</span>
            </button>
          </Tooltip>
        </span>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`max-w-none ${isUser ? 'text-white' : 'text-black/90'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children }) => (
            <p className="m-0 mb-2 last:mb-0 leading-[1.6]">
              {React.Children.map(children, (child) => 
                typeof child === 'string' ? renderWithCitations(child) : child
              )}
            </p>
          ),
          li: ({ children }) => (
            <li className="m-0 p-0">
              {React.Children.map(children, (child) => 
                typeof child === 'string' ? renderWithCitations(child) : child
              )}
            </li>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 m-0 mb-2 last:mb-0 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 m-0 mb-2 last:mb-0 space-y-1">{children}</ol>,
          strong: ({ children }) => <span className="font-bold text-inherit">{children}</span>,
          code: ({ children }) => (
            <code className={`px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono ${
              isUser ? 'bg-white/10 text-white' : 'bg-black/5 text-[#D32F2F]'
            }`}>
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline font-semibold underline-offset-2 ${isUser ? 'text-white' : 'text-[#0075de] hover:text-[#005bab]'}`}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-black/[0.08] rounded-[6px]">
              <table className="min-w-full divide-y divide-black/[0.05] bg-white text-black">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-black/[0.02]">{children}</thead>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[11px] font-bold text-black/40 border-b border-black/[0.05]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-[13px] text-black/70 border-b border-black/[0.03] last:border-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Citation Detail Overlay */}
      {activeCitation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setActiveCitation(null)} />
          <div className="relative w-full max-w-[500px] bg-white rounded-[12px] shadow-zalo-l4 border border-black/[0.08] flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2 overflow-hidden">
                <BookOpen className="w-4 h-4 text-[#D32F2F] shrink-0" />
                <h3 className="text-[14px] font-bold text-black/80 truncate">{activeCitation.name}</h3>
              </div>
              <button onClick={() => setActiveCitation(null)} className="p-1 text-black/40 hover:bg-black/5 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div className="text-[14px] text-black/70 leading-[1.6] whitespace-pre-wrap bg-black/[0.02] p-4 rounded-[8px] border border-black/[0.04]">
                {activeCitation.content}
              </div>
              <p className="mt-4 text-[11px] text-black/40 italic">
                * Đây là đoạn trích chính xác mà MATE đã sử dụng để đưa ra câu trả lời.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
