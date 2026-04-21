import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isUser }) => {
  return (
    <div className={`max-w-none ${isUser ? 'text-white' : 'text-black/90'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children }) => <p className="m-0 mb-2 last:mb-0 leading-[1.6]">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 m-0 mb-2 last:mb-0 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 m-0 mb-2 last:mb-0 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="m-0 p-0">{children}</li>,
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
            <th className="px-3 py-2 text-left text-[11px] font-bold text-black/40 uppercase tracking-widest border-b border-black/[0.05]">
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
    </div>
  );
};
