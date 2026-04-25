import React, { useEffect, useRef, memo, useMemo } from 'react';
import { Message } from '@core/types/chat';
import { MessageItem } from './message-item';
import { AgentSteps } from './agent-steps';
import { HubView } from './hub-view';
import { type KnowledgeCollection } from '@core/services/supabase.service';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isHistoryLoading?: boolean;
  loadingPhase?: string;
  phaseDetail?: string;
  agentReflections?: string[];
  currentMode?: string;
  sessionId?: string;
  collections?: KnowledgeCollection[];
  onCollectionSelect?: (mode: string) => void;
  onSuggestionClick?: (text: string) => void;
}

export const MessageList = memo(({ 
  messages, isLoading, isHistoryLoading, loadingPhase, phaseDetail, agentReflections, currentMode, sessionId, 
  collections = [], onCollectionSelect, onSuggestionClick 
}: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => { 
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
    }
  }, [messages.length, isLoading, loadingPhase]);

  const renderedMessages = useMemo(() => {
    return messages.map((msg, idx) => (
      msg.content ? (
        <MessageItem 
          key={msg.id || `msg-${idx}`} 
          message={msg} 
          conversation={messages} 
          sessionId={sessionId}
          isChatLoading={isLoading} 
        />
      ) : null
    ));
  }, [messages, isLoading, sessionId]);

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
        <HubView 
          collections={collections}
          currentMode={currentMode || 'auto'}
          onCollectionSelect={onCollectionSelect || (() => {})}
          isLoading={isLoading && collections.length === 0}
        />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-24 lg:px-48 py-6 space-y-10 scroll-smooth bg-white custom-scrollbar">
      <div className="w-full space-y-10 max-w-4xl mx-auto">
        {renderedMessages}
        {isLoading && loadingPhase && loadingPhase !== 'generate' && (
          <AgentSteps 
            phase={loadingPhase} 
            detail={phaseDetail} 
            reflections={agentReflections} 
          />
        )}
      </div>
    </div>
  );
});

MessageList.displayName = 'MessageList';
