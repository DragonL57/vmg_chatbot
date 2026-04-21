import React, { useState } from 'react';
import { Flag, X, Send } from 'lucide-react';
import { Message } from '@core/types/chat';

interface ReportModalProps {
  message: Message;
  conversation: Message[];
  sessionId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PROBLEM_OPTIONS = [
  'Câu trả lời sai',
  'Lỗi thực tế',
  'Thiếu thông tin',
  'Thông tin lỗi thời',
  'Không liên quan',
  'Khác',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  message,
  conversation,
  sessionId,
  onClose,
  onSuccess,
}) => {
  const [note, setNote] = useState('');
  const [problemType, setProblemType] = useState('');
  const [reportState, setReportState] = useState<'idle' | 'loading' | 'error'>('idle');

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
        onSuccess();
      } else {
        setReportState('error');
      }
    } catch {
      setReportState('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000]/60 backdrop-blur-sm animate-in fade-in duration-200 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#ffffff] rounded-[16px] shadow-[0_8px_16px_rgba(0,0,0,0.12)] w-full max-w-[320px] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f5f5f5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-[#D32F2F]" strokeWidth={2} />
            <h3 className="text-[17px] font-semibold text-[#000000]">Báo cáo nội dung</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#999999] hover:text-[#000000]">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          <div>
            <label className="text-[12px] font-semibold text-[#666666] mb-3 block">Lý do báo cáo</label>
            <div className="grid grid-cols-2 gap-2">
              {PROBLEM_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setProblemType(opt === problemType ? '' : opt)}
                  className={`py-2 px-1 rounded-[8px] text-[13px] font-medium border transition-all text-center ${
                    problemType === opt
                      ? 'bg-[#FFEBEE] border-[#D32F2F] text-[#D32F2F]'
                      : 'bg-[#ffffff] border-[#e5e5e5] text-[#333333]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#666666] mb-2 block">Chi tiết thêm (không bắt buộc)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Vui lòng cho biết thêm chi tiết..."
              rows={3}
              className="w-full text-[14px] text-[#000000] bg-[#f5f5f5] rounded-[8px] px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#D32F2F] border-transparent transition-all placeholder:text-[#999999]"
            />
          </div>

          {reportState === 'error' && (
            <p className="text-[12px] text-[#ff3b30] font-medium text-center">Gửi thất bại, vui lòng thử lại.</p>
          )}
        </div>

        {/* Actions - Vertical stack or Horizontal based on Zalo style */}
        <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
          <button
            onClick={handleReport}
            disabled={reportState === 'loading' || !problemType}
            className={`w-full h-[44px] rounded-[8px] text-[16px] font-semibold transition-all flex items-center justify-center gap-2 ${
              !problemType || reportState === 'loading'
                ? 'bg-[#e5e5e5] text-[#999999]'
                : 'bg-[#D32F2F] text-[#ffffff] active:opacity-90'
            }`}
          >
            {reportState === 'loading' ? 'Đang gửi...' : 'Gửi ngay'}
          </button>
          <button
            onClick={onClose}
            className="w-full h-[44px] rounded-[8px] text-[16px] font-semibold text-[#666666] hover:bg-[#f5f5f5] transition-all"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};
