import React, { useState } from 'react';
import { Message } from '@core/types/chat';
import { Database, ChevronDown, ChevronUp, Search, Flag } from 'lucide-react';
import { MarkdownContent } from './markdown-content';
import { ReportModal } from './report-modal';

interface MessageItemProps {
  message: Message;
  conversation?: Message[];
  sessionId?: string;
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

export const MessageItem: React.FC<MessageItemProps> = ({ message, conversation = [], sessionId }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isSafetyWarning = message.content?.includes('⚠️ Cảnh báo vi phạm chính sách an toàn');
  const [showModal, setShowModal] = useState(false);
  const [reportState, setReportState] = useState<'idle' | 'done'>('idle');

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
            <MarkdownContent content={message.content} isUser={isUser} />
            
            <div className={`text-[11px] mt-2 font-medium flex items-center gap-1.5 ${isUser ? 'text-white/50' : 'text-black/25'}`}>
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>

          {!isUser && !isSystem && (
            <div className="px-4 w-full">
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
            </div>
          )}
        </div>
      </div>
    </>
  );
};
