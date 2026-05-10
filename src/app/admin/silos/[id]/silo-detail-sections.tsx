'use client';

import React from 'react';
import { Search, ChevronLeft, Check, Loader2, Sparkles } from 'lucide-react';
import { UploadPanel } from '@/components/admin/upload-panel';
import { FileTable } from '@/components/admin/file-table';
import { type KnowledgeCollection, type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';

export const LoadingView = () => (
  <div className="flex-1 flex items-center justify-center bg-white">
    <Loader2 className="w-6 h-6 animate-spin text-black/20" />
  </div>
);

type SiloHeaderProps = {
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
  saving: boolean;
};

export const SiloHeader = ({ onBack, onDelete, onSave, saving }: SiloHeaderProps) => (
  <div className="flex items-center justify-between">
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-[14px] font-medium text-black/40 hover:text-black/80 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
    </button>
    <div className="flex items-center gap-2">
      <button
        onClick={onDelete}
        className="h-8 px-3 rounded-[4px] text-red-600 hover:bg-red-50 text-[13px] font-medium transition-all"
      >
        Xóa không gian
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="notion-btn-primary flex items-center gap-2 h-8 px-4"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Lưu thông tin</>}
      </button>
    </div>
  </div>
);

type SiloMetadataFormProps = {
  activeSilo: KnowledgeCollection | null;
  siloName: string;
  siloDesc: string;
  onSiloNameChange: (value: string) => void;
  onSiloDescChange: (value: string) => void;
  onRegenerate: () => void;
};

export const SiloMetadataForm = ({
  activeSilo,
  siloName,
  siloDesc,
  onSiloNameChange,
  onSiloDescChange,
  onRegenerate,
}: SiloMetadataFormProps) => (
  <div className="space-y-4">
    <input
      type="text"
      value={siloName}
      onChange={event => onSiloNameChange(event.target.value)}
      placeholder="Tên không gian tri thức..."
      className="w-full text-[32px] font-bold bg-transparent border-none focus:outline-none placeholder:text-black/10 transition-all tracking-tight"
    />
    <div className="space-y-2 group relative">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-black/20">Mô tả không gian</label>
        <button
          onClick={onRegenerate}
          className="text-[12px] font-bold text-[#D32F2F] hover:underline flex items-center gap-1.5"
          title="AI sẽ tóm tắt nội dung từ tất cả file trong không gian này"
        >
          <Sparkles className="w-3 h-3" /> Viết lại bằng AI
        </button>
      </div>
      <textarea
        value={siloDesc}
        onChange={event => onSiloDescChange(event.target.value)}
        placeholder="Thêm mô tả cho không gian tri thức này..."
        rows={2}
        className="w-full text-[16px] text-[#615d59] font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-black/[0.03] rounded-md p-1 -m-1 resize-none placeholder:text-black/10 transition-all leading-relaxed"
      />
    </div>
    <div className="flex items-center gap-2 pt-2">
      <span className="text-[11px] font-bold text-black/30 bg-black/[0.03] px-2 py-0.5 rounded">
        Identifier: {activeSilo?.collectionKey}
      </span>
    </div>
  </div>
);

type SiloUploadSectionProps = {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onUpload: () => void;
  uploading: boolean;
  disabled: boolean;
};

export const SiloUploadSection = ({
  selectedFile,
  onFileSelect,
  onUpload,
  uploading,
  disabled,
}: SiloUploadSectionProps) => (
  <div className="lg:col-span-4 sticky top-0">
    <UploadPanel
      selectedFile={selectedFile}
      onFileSelect={onFileSelect}
      onUpload={onUpload}
      uploading={uploading}
      disabled={disabled}
    />
  </div>
);

type SiloFileListProps = {
  files: KnowledgeFile[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onDelete: (fileId: string) => void;
  siloId: string;
};

export const SiloFileList = ({ files, searchQuery, onSearchChange, onDelete, siloId }: SiloFileListProps) => (
  <div className="lg:col-span-8 space-y-6">
    <div className="flex items-center justify-between px-1">
      <h3 className="text-[12px] font-bold text-black/40">Danh sách tài liệu ({files.length})</h3>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
        <input
          type="text"
          placeholder="Tìm tài liệu..."
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
          className="w-full bg-black/[0.02] border border-black/[0.06] rounded-[6px] py-1.5 pl-9 pr-4 text-[13px] focus:bg-white focus:border-[#D32F2F]/30 outline-none transition-all shadow-sm"
        />
      </div>
    </div>
    <FileTable siloId={siloId} files={files} onDelete={onDelete} />
  </div>
);
