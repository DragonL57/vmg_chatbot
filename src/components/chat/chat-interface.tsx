'use client';

import React, { memo, Suspense } from 'react';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { Menu, Settings2, LayoutGrid } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';

interface ChatInterfaceProps {
  onToggleSidebar?: () => void;
}

const ChatHeader = memo(({ onToggleSidebar }: { onToggleSidebar?: () => void }) => (
  <header className="bg-white border-b border-black/[0.06] px-4 h-[44px] flex items-center justify-between shrink-0">
    <button 
      onClick={onToggleSidebar} 
      className="p-2 md:hidden"
      aria-label="Mở menu điều hướng"
    >
      <Menu className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-2">
      <LayoutGrid className="w-4 h-4 text-black/40" />
      <span className="text-sm font-medium text-black/60">Không gian</span>
    </div>
    <button 
      className="p-2"
      aria-label="Cài đặt không gian"
    >
      <Settings2 className="w-5 h-5 text-black/40" />
    </button>
  </header>
));
ChatHeader.displayName = 'ChatHeader';

const ChatContent: React.FC<ChatInterfaceProps> = ({ onToggleSidebar }) => {
  const {
    sessionId, messages, input, setInput, isLoading, loadingPhase,
    isHistoryLoading, collections, isCollectionsLoading, selectedCollection, setSelectedCollection, sendMessage
  } = useChat();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  };

  return (
    <div className="flex-1 flex flex-col relative bg-white min-h-0">
      <ChatHeader onToggleSidebar={onToggleSidebar} />
      <div className="flex-1 flex flex-col min-h-0 relative">
        <MessageList 
          messages={messages} isLoading={isLoading} isHistoryLoading={isHistoryLoading}
          loadingPhase={loadingPhase}
          currentMode={selectedCollection} sessionId={sessionId} collections={collections}
          isCollectionsLoading={isCollectionsLoading}
          onCollectionSelect={setSelectedCollection} onSuggestionClick={sendMessage} 
        />
      </div>

      <div className="p-4 md:px-32 max-w-5xl mx-auto w-full shrink-0 space-y-2">
        <ChatInput 
          input={input} 
          handleInputChange={handleInputChange} 
          handleSubmit={handleFormSubmit} 
          isLoading={isLoading} 
        />
        <p className="text-[11px] text-black/30 text-center italic leading-tight">
          MATE là trí tuệ nhân tạo, vui lòng kiểm tra lại thông tin
        </p>
      </div>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = (props) => (
  <Suspense fallback={<div>Loading...</div>}>
    <ChatContent {...props} />
  </Suspense>
);
