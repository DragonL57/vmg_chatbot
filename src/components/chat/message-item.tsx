import React, { useState } from 'react';
import { Message } from '@core/types/chat';
import { Database, ChevronDown, ChevronUp, Search, Flag, BrainCircuit, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { MarkdownContent } from './markdown-content';
import { ReportModal } from './report-modal';
import { AgentSteps } from './agent-steps';

interface MessageItemProps {
  message: Message;
  conversation?: Message[];
  sessionId?: string;
  isChatLoading?: boolean;
}

const SystemMessage: React.FC<{ message: Message }> = ({ message }) => {
  const [showData, setShowData] = useState(false);
  const isTool = message.isToolCall;

  return (
    <div className="flex justify-center my-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center max-w-[90%] w-full">
        <button 
          onClick={() => isTool ? null : setShowData(!showData)}
          className={`flex items-center gap-2 px-3 py-1 rounded-[6px] text-[12px] font-medium transition-all border ${
            isTool ? 'bg-[#FFEBEE] border-[#D32F2F]/10 text-[#D32F2F]' : 'bg-black/[0.02] border-black/[0.05] text-black/40 hover:bg-black/[0.04]'
          }`}
        >
          {isTool ? <Search className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
          {message.content}
          {!isTool && (showData ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
        </button>
        {showData && message.leadData && (
          <div className="mt-3 w-full bg-[#1A1C1E] text-white p-5 rounded-[8px] text-[12px] font-mono overflow-x-auto shadow-notion">
            <pre className="whitespace-pre-wrap">{JSON.stringify(message.leadData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, conversation = [], sessionId, isChatLoading }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isSafetyWarning = message.content?.includes('⚠️ Cảnh báo vi phạm chính sách an toàn');
  const [showModal, setShowModal] = useState(false);
  const [reportState, setReportState] = useState<'idle' | 'done'>('idle');
  const [feedback, setFeedback] = useState<number | null>(null);

  // Logic to determine if this message is currently being "typed" by the AI
  const isGenerating = isChatLoading && !isUser && !isSystem && conversation[conversation.length - 1]?.id === message.id;

  const handleFeedback = async (type: 1 | -1) => {
    if (!message.traceId || feedback !== null) return;
    setFeedback(type);
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traceId: message.traceId, feedback: type }),
      });
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };

  if (isSystem) return <SystemMessage message={message} />;

  return (
    <>
      {showModal && (
        <ReportModal
          message={message}
          conversation={conversation}
          sessionId={sessionId}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setReportState('done'); }}
        />
      )}

      <div className={`flex w-full animate-in fade-in duration-400 group ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${isUser ? 'max-w-[85%] md:max-w-[75%]' : 'w-full'}`}>
          
          {/* Timestamp on Top */}
          <div className={`text-[10px] mb-1 font-medium text-black/20 flex items-center gap-1.5 ${isUser ? 'mr-1' : 'ml-1'}`}>
            {message.timestamp ? new Date(message.timestamp).toLocaleString('vi-VN', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : ''}
          </div>

          <div
            className={`w-full px-4 py-3 text-[15px] leading-[1.6] relative transition-all ${
              isUser
                ? 'bg-[#D32F2F] border-transparent text-white rounded-[12px] shadow-sm border'
                : isSafetyWarning
                  ? 'bg-[#fff9f6] text-[#dd5b00] border border-[#dd5b00]/10 rounded-[12px] italic'
                  : `bg-transparent text-black/95 ${
                      message.isAmbiguous ? 'border-l-4 border-[#D32F2F] pl-6' : ''
                    }`
            }`}
          >
            {!isUser && message.reasoningTrace && message.reasoningTrace.length > 0 && (
              <AgentSteps 
                phase={isGenerating ? 'generate' : 'complete'} 
                reflections={message.reasoningTrace} 
                defaultCollapsed={true} 
              />
            )}
            <MarkdownContent content={message.content} isUser={isUser} />
            
            {!isUser && message.memoryUpdated && (
              <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 bg-black/[0.02] border border-black/[0.04] rounded-md w-fit animate-in fade-in duration-700">
                <span className="text-[11px] font-medium text-black/40 italic">MATE đã ghi nhớ thêm thông tin</span>
              </div>
            )}
          </div>

          {!isUser && !isSystem && (
            <div className="px-4 w-full flex items-center gap-4">
              <button
                onClick={() => { if (reportState !== 'done') setShowModal(true); }}
                className={`mt-1.5 flex items-center gap-1.5 py-0.5 rounded-[4px] text-[11px] font-medium transition-all
                  ${reportState === 'done'
                    ? 'text-[#1aae39]'
                    : 'text-black/20 hover:text-black/60'
                  }`}
              >
                <Flag className="w-3 h-3" />
                {reportState === 'done' ? 'Đã báo cáo' : 'Báo cáo'}
              </button>

              {/* Observability Feedback */}
              {isAssistant && message.traceId && !isGenerating && (
                <div className="flex items-center gap-2 mt-1.5 border-l border-black/[0.05] pl-4 animate-in fade-in slide-in-from-left-1 duration-300">
                  <button
                    onClick={() => handleFeedback(1)}
                    disabled={feedback !== null}
                    className={`p-0.5 hover:bg-black/[0.03] rounded transition-colors ${feedback === 1 ? 'text-green-600' : 'text-black/20 hover:text-black/60'}`}
                  >
                    {feedback === 1 ? <Check className="w-3 h-3" /> : <ThumbsUp className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => handleFeedback(-1)}
                    disabled={feedback !== null}
                    className={`p-0.5 hover:bg-black/[0.03] rounded transition-colors ${feedback === -1 ? 'text-red-600' : 'text-black/20 hover:text-black/60'}`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                  {/* Trace ID indicator (mini) */}
                  <span className="text-[9px] font-mono text-black/10 select-none ml-1">
                    {message.traceId.split('-')[0]}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
