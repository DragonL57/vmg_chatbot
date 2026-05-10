import React, { useEffect, useRef, memo, useMemo } from 'react';
import { Message } from '@core/types/chat';
import { MessageItem } from './message-item';
import { HubView } from './hub-view';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isHistoryLoading?: boolean;
  loadingPhase?: string;
  sessionId?: string;
  onSuggestionClick?: (content: string) => void;
}

export const MessageList = memo(({ 
  messages, isLoading, isHistoryLoading, loadingPhase, sessionId, 
}: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on every content change
  useEffect(() => { 
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading, loadingPhase]);

  const renderedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      // Render if it has content OR it's an assistant message with reasoning (even if empty content)
      const shouldRender = msg.content || (msg.role === 'assistant' && msg.reasoningTrace && msg.reasoningTrace.length > 0);
      
      if (!shouldRender) return null;

      return (
        <MessageItem 
          key={msg.id || `msg-${idx}`} 
          message={msg} 
          conversation={messages} 
          sessionId={sessionId}
          isChatLoading={isLoading} 
          loadingPhase={loadingPhase}
        />
      );
    });
  }, [messages, isLoading, sessionId, loadingPhase]);

  if (isHistoryLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-24 lg:px-48 py-6 space-y-10 bg-white custom-scrollbar">
        <div className="w-full space-y-10 max-w-4xl mx-auto">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 bg-black/5 rounded-full shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-4 bg-black/5 rounded w-3/4" />
                <div className="h-4 bg-black/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0 && (!isLoading || (isLoading && messages.length === 0))) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white custom-scrollbar">
        <HubView isLoading={isHistoryLoading} />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-24 lg:px-48 py-6 space-y-10 scroll-smooth bg-white custom-scrollbar">
      <div className="w-full space-y-10 max-w-4xl mx-auto">
        {renderedMessages}
      </div>
      <div ref={bottomRef} className="h-4" />
    </div>
  );
});

MessageList.displayName = 'MessageList';
