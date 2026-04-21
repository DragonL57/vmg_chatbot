import React, { KeyboardEvent, useRef, useEffect } from 'react';
import { ArrowUp, Plus } from 'lucide-react';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ input, handleInputChange, handleSubmit, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) form.requestSubmit();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-white rounded-[12px] border border-black/[0.1] shadow-notion p-1 flex flex-col gap-1 transition-all focus-within:ring-[3px] focus-within:ring-[#D32F2F]/10 focus-within:border-[#D32F2F]/30"
    >
      <div className="flex-1 px-3 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder="Nhập câu hỏi của bạn..."
          disabled={isLoading}
          className="w-full max-h-[160px] resize-none bg-transparent py-1 text-[16px] font-normal leading-[1.5] focus:outline-none disabled:opacity-50 placeholder:text-[#a39e98] text-black/90"
        />
      </div>

      <div className="flex items-center justify-between px-2 pb-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 text-black/40 hover:bg-black/5 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`w-7 h-7 flex items-center justify-center rounded-[4px] transition-all ${
            !input.trim() || isLoading 
              ? 'text-black/20 bg-black/[0.03]' 
              : 'text-white bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-95 shadow-sm'
          }`}
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
};
