import React from 'react';
import { UploadCloud, FileText, Plus, Loader2 } from 'lucide-react';

interface UploadPanelProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onUpload: () => void;
  uploading: boolean;
  disabled: boolean;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  selectedFile,
  onFileSelect,
  onUpload,
  uploading,
  disabled
}) => {
  return (
    <div className="bg-white p-6 rounded-[12px] border border-black/[0.08] shadow-sm">
      <h2 className="text-[17px] font-bold text-black/90 mb-6 flex items-center gap-2">
        <UploadCloud className="w-5 h-5 text-[#D32F2F]" /> Nạp tri thức mới
      </h2>
      
      <div className="space-y-6">
        <div className={`relative group border-2 border-dashed rounded-[8px] p-8 transition-all text-center ${
          selectedFile ? 'border-[#D32F2F] bg-[#FFEBEE]/10' : 'border-black/[0.08] hover:border-black/[0.15] bg-black/[0.01]'
        }`}>
          <input 
            type="file" 
            accept=".md,.txt,.pdf" 
            onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading || disabled}
          />
          <div className="flex flex-col items-center gap-3">
            {selectedFile ? (
              <>
                <FileText className="w-8 h-8 text-[#D32F2F]" />
                <div className="text-[14px] font-semibold text-black/80 truncate max-w-full px-4">{selectedFile.name}</div>
                <button 
                  type="button" 
                  onClick={() => onFileSelect(null)} 
                  className="text-[12px] font-bold text-red-600 hover:underline"
                >
                  Xóa tệp
                </button>
              </>
            ) : (
              <>
                <Plus className="w-8 h-8 text-black/20 group-hover:text-black/40 transition-colors" />
                <div className="space-y-1">
                  <p className="text-[14px] font-bold text-black/70">Kéo thả PDF, TXT hoặc Markdown</p>
                  <p className="text-[12px] text-black/30 font-medium">Hỗ trợ tối đa 50MB</p>
                </div>
              </>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => { e.preventDefault(); onUpload(); }} 
          disabled={!selectedFile || uploading || disabled}
          className={`w-full h-10 rounded-[6px] font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${
            !selectedFile || uploading || disabled 
              ? 'bg-black/[0.05] text-black/30 cursor-not-allowed' 
              : 'bg-[#D32F2F] text-white hover:bg-[#B71C1C] active:scale-[0.98] shadow-sm'
          }`}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên...</>
          ) : (
            <><UploadCloud className="w-4 h-4" /> Bắt đầu xử lý</>
          )}
        </button>
      </div>
    </div>
  );
};
