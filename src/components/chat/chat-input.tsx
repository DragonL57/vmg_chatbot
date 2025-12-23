import React, { KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * Input component for the chat interface.
 */
export const ChatInput: React.FC<ChatInputProps> = ({ input, handleInputChange, handleSubmit, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="p-3 bg-white">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative bg-slate-100 rounded-2xl border border-slate-200 focus-within:border-[#D32F2F] focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Bạn cần hỗ trợ gì ạ?..."
            disabled={isLoading}
            className="w-full max-h-[120px] resize-none bg-transparent py-3 px-4 text-sm focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#D32F2F] text-white rounded-2xl w-11 h-11 flex items-center justify-center shrink-0 hover:bg-[#B71C1C] active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md shadow-[#D32F2F]/10"
          title="Gửi"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};
