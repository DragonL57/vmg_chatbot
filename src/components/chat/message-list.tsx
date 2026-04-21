import React, { useEffect, useRef } from 'react';
import { Message } from '@core/types/chat';
import { MessageItem } from './message-item';
import { AgentSteps } from './agent-steps';
import { HubView } from './hub-view';
import { type KnowledgeCollection } from '@core/services/supabase.service';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  loadingPhase?: string;
  phaseDetail?: string;
  currentMode?: string;
  sessionId?: string;
  collections?: KnowledgeCollection[];
  onCollectionSelect?: (mode: string) => void;
  onSuggestionClick?: (text: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, isLoading, loadingPhase, phaseDetail, currentMode, sessionId, 
  collections = [], onCollectionSelect, onSuggestionClick 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [messages.length, isLoading, loadingPhase]);

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
        {messages.map((msg) => (
          msg.content ? <MessageItem key={msg.id} message={msg} conversation={messages} sessionId={sessionId} /> : null
        ))}
        {isLoading && loadingPhase && <AgentSteps phase={loadingPhase} detail={phaseDetail} />}
      </div>
    </div>
  );
};
