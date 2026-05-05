'use client';

import React from 'react';
import { ChevronLeft, Check, Loader2, Sparkles, Database } from 'lucide-react';
import { type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';

type LoadingViewProps = {
  label?: string;
};

export const LoadingView = ({ label = 'Đang tải...' }: LoadingViewProps) => (
  <div className="flex-1 flex items-center justify-center bg-white">
    <div className="flex items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-black/20" />
      <span className="text-[13px] text-black/40">{label}</span>
    </div>
  </div>
);

type FileDetailHeaderProps = {
  siloName?: string | null;
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
  saving: boolean;
};

export const FileDetailHeader = ({ siloName, onBack, onDelete, onSave, saving }: FileDetailHeaderProps) => (
  <div className="space-y-4">
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-[14px] font-medium text-black/40 hover:text-black/80 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" /> Quay lại {siloName}
    </button>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-[32px] font-bold tracking-tight text-black/90">Chi tiết tài liệu</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDelete}
          className="h-9 px-4 rounded-[6px] text-red-600 hover:bg-red-50 font-medium text-[14px] transition-all"
        >
          Xóa tài liệu
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="notion-btn-primary flex items-center gap-2 min-w-[100px] justify-center"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Lưu thay đổi</>}
        </button>
      </div>
    </div>
  </div>
);

type FileDetailFormProps = {
  filename: string;
  summary: string;
  onFilenameChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onRegenerateSummary: () => void;
};

export const FileDetailForm = ({
  filename,
  summary,
  onFilenameChange,
  onSummaryChange,
  onRegenerateSummary,
}: FileDetailFormProps) => (
  <div className="lg:col-span-2 space-y-8">
    <div className="space-y-2">
      <label className="text-[12px] font-bold text-black/40 ml-1">Tên tài liệu</label>
      <input
        type="text"
        value={filename}
        onChange={event => onFilenameChange(event.target.value)}
        className="w-full text-[20px] font-semibold bg-transparent border-b border-black/[0.06] focus:border-[#D32F2F] outline-none pb-2 transition-all"
      />
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-bold text-black/40 ml-1">Tóm tắt tri thức (AI)</label>
        <button
          onClick={onRegenerateSummary}
          className="text-[12px] font-bold text-[#D32F2F] hover:underline flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" /> Tạo lại tóm tắt
        </button>
      </div>
      <textarea
        value={summary}
        onChange={event => onSummaryChange(event.target.value)}
        rows={8}
        className="w-full text-[15px] leading-relaxed bg-[#f6f5f4] border border-black/[0.05] rounded-[8px] p-4 focus:bg-white focus:border-[#D32F2F]/30 outline-none transition-all resize-none"
        placeholder="Nhập tóm tắt tri thức để AI hiểu tài liệu này tốt hơn..."
      />
    </div>
  </div>
);

type FileDetailInfoProps = {
  file: KnowledgeFile | null;
};

const IndexingStatus = ({ file }: { file: KnowledgeFile | null }) => {
  const status = file?.status ?? 'unknown';
  const dotColor = status === 'completed' ? 'bg-[#1aae39]' : status === 'failed' ? 'bg-red-500' : status === 'indexing' ? 'bg-amber-400 animate-pulse' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold text-black/30">Trạng thái index</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-[14px] font-semibold capitalize">{status === 'indexing' ? `Đang xử lý: ${file?.progress || 0}%` : status}</span>
      </div>
      {status === 'indexing' && (
        <div className="w-full h-1.5 bg-black/[0.06] rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-[#D32F2F] rounded-full transition-all duration-500" style={{ width: `${file?.progress || 0}%` }} />
        </div>
      )}
    </div>
  );
};

export const FileDetailInfo = ({ file }: FileDetailInfoProps) => (
  <div className="space-y-6">
    <div className="notion-card p-5 space-y-4">
      <h4 className="text-[13px] font-bold text-black/40">Thông tin hệ thống</h4>
      <div className="space-y-4">
        <IndexingStatus file={file} />
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-black/30">Không gian (Mode)</p>
          <div className="flex items-center gap-2 text-black/60">
            <Database className="w-3.5 h-3.5" />
            <span className="text-[13px] font-mono">{file?.mode}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-black/30">ID tài liệu</p>
          <p className="text-[12px] font-mono text-black/40 break-all">{file?.id}</p>
        </div>
      </div>
    </div>
  </div>
);
