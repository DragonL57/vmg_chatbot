import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Message } from '@core/types/chat';
import { Database, ChevronDown, ChevronUp, Search, Flag, X, Send } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  conversation?: Message[];
  sessionId?: string;
}

/**
 * Individual message component that renders a single chat message.
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message, conversation = [], sessionId }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.isToolCall;
  const isSafetyWarning = message.content?.includes('⚠️ Cảnh báo vi phạm chính sách an toàn');
  const [showData, setShowData] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');
  const [problemType, setProblemType] = useState('');
  const [reportState, setReportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const PROBLEM_OPTIONS = [
    'Câu trả lời sai về nội dung',
    'Đúng lý thuyết nhưng chưa chính xác về thực tế',
    'Thiếu thông tin quan trọng',
    'Thông tin đã lỗi thời',
    'Câu trả lời không liên quan đến câu hỏi',
    'Số liệu / học phí sai',
    'Khác',
  ];

  const handleReport = async () => {
    if (reportState === 'loading') return;
    setReportState('loading');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedMessage: message.content,
          conversation: conversation.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          note: [problemType, note.trim()].filter(Boolean).join(' — ') || null,
          sessionId: sessionId ?? null,
        }),
      });
      if (res.ok) {
        setReportState('done');
        setShowModal(false);
        setNote('');
        setProblemType('');
      } else {
        setReportState('error');
      }
    } catch {
      setReportState('error');
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center max-w-[90%] w-full">
          <button 
            onClick={() => isTool ? null : setShowData(!showData)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors shadow-sm ${
              isTool 
                ? 'bg-blue-50 border border-blue-100 text-blue-600' 
                : 'bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {isTool ? <Search className="w-3 h-3 animate-pulse" /> : <Database className="w-3 h-3 text-blue-500" />}
            {message.content}
            {!isTool && (showData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          
          {showData && message.leadData && (
            <div className="mt-2 w-full bg-slate-800 text-blue-300 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-60 overflow-y-auto shadow-inner border border-slate-700 animate-in slide-in-from-top-2 duration-300 custom-scrollbar">
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(message.leadData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Report Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setReportState('idle'); setProblemType(''); setNote(''); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="bg-red-50 p-1.5 rounded-lg">
                  <Flag className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Báo cáo câu trả lời</p>
                  <p className="text-[10px] text-slate-400">Giúp chúng tôi cải thiện chất lượng</p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setReportState('idle'); setProblemType(''); setNote(''); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Problem type + note */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Loại vấn đề <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROBLEM_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setProblemType(opt === problemType ? '' : opt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        problemType === opt
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Ghi chú thêm <span className="text-slate-300 normal-case font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Mô tả chi tiết hơn nếu cần..."
                  rows={2}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 placeholder:text-slate-300 transition-all"
                />
              </div>
              {reportState === 'error' && (
                <p className="text-xs text-red-500">Gửi thất bại, thử lại nhé.</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-4 flex gap-2 justify-end">
              <button
                onClick={() => { setShowModal(false); setReportState('idle'); setProblemType(''); setNote(''); }}
                className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleReport}
                disabled={reportState === 'loading' || !problemType}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-wait rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                {reportState === 'loading' ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message row */}
      <div className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 group ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%]`}>
          <div
            className={`w-full rounded-2xl px-4 py-2.5 text-sm shadow-sm relative transition-all duration-700 ${
              isUser
                ? 'bg-[#D32F2F] text-white rounded-tr-sm'
                : isSafetyWarning
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-sm shadow-amber-100/50 italic font-medium'
                  : `bg-white text-slate-700 border rounded-tl-sm shadow-slate-200/50 ${
                      message.isAmbiguous 
                        ? 'border-[#D32F2F]/60 shadow-[0_0_12px_rgba(211,47,47,0.25)]' 
                        : 'border-slate-200'
                    }`
            }`}
          >
            <div className="leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  p: ({ children }) => <p className="m-0 mb-1.5 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 m-0 mb-1.5 last:mb-0 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 m-0 mb-1.5 last:mb-0 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="m-0 p-0">{children}</li>,
                  strong: ({ children }) => <span className="font-bold text-inherit">{children}</span>,
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`underline font-medium underline-offset-2 ${isUser ? 'text-white' : 'text-[#D32F2F]'}`}
                    >
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 -mx-1">
                      <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100 last:border-0">
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            <div
              className={`text-[9px] mt-1.5 font-medium flex items-center gap-1 ${
                isUser ? 'text-white/70' : 'text-slate-400'
              }`}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {isUser && <span className="text-[8px]">✓</span>}
            </div>
          </div>

          {/* Report button — below bubble, aligned right, always visible */}
          {!isUser && !isSystem && (
            <button
              onClick={() => {
                if (reportState === 'done') return;
                setReportState('idle');
                setShowModal(true);
              }}
              className={`self-end mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-200
                ${reportState === 'done'
                  ? 'text-green-600 bg-green-50 border-green-200 cursor-default'
                  : 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100 hover:shadow-sm'
                }`}
            >
              <Flag className="w-3 h-3" />
              {reportState === 'done' ? 'Đã báo cáo' : 'Báo cáo sai'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

