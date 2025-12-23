import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

/**
 * Input component for the chat interface.
 * Handles text input, Enter key submission, and loading state.
 * 
 * @param {ChatInputProps} props - The component props
 * @param {(content: string) => void} props.onSendMessage - Callback function when a message is sent
 * @param {boolean} props.isLoading - Whether the chat is currently waiting for a response
 * @returns {JSX.Element} The rendered chat input
 */
export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Nhập câu hỏi của bạn tại đây..."
          disabled={isLoading}
          className="flex-1 resize-none rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] disabled:bg-gray-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-[#D32F2F] text-white rounded-lg p-2 hover:bg-[#B71C1C] disabled:bg-gray-300 transition-colors"
          title="Gửi"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
