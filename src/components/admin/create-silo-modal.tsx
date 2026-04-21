import React from 'react';

interface CreateSiloModalProps {
  name: string;
  onNameChange: (v: string) => void;
  qName: string;
  onQNameChange: (v: string) => void;
  desc: string;
  onDescChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CreateSiloModal: React.FC<CreateSiloModalProps> = ({
  name, onNameChange, qName, onQNameChange, desc, onDescChange, onSubmit, onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/[0.2] backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-notion border border-black/[0.1] max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-[20px] font-bold text-black/90 mb-2">Tạo không gian mới</h3>
        <p className="text-[#615d59] text-[14px] mb-8">Xây dựng một cơ sở tri thức độc lập cho AI.</p>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-black/40 uppercase tracking-widest ml-1">Tên hiển thị</label>
            <input 
              type="text" required placeholder="Ví dụ: Quy trình Du học" 
              value={name} onChange={(e) => onNameChange(e.target.value)} 
              className="w-full notion-input" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-black/40 uppercase tracking-widest ml-1">Mã định danh (Slug)</label>
            <input 
              type="text" placeholder="vmg_edu_silo" 
              value={qName} onChange={(e) => onQNameChange(e.target.value)} 
              className="w-full notion-input" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-black/40 uppercase tracking-widest ml-1">Mô tả</label>
            <textarea 
              placeholder="Mô tả ngắn gọn về nội dung..." 
              value={desc} onChange={(e) => onDescChange(e.target.value)} 
              rows={3} className="w-full notion-input resize-none" 
            />
          </div>
          <div className="flex items-center gap-3 mt-10">
            <button 
              type="button" onClick={onClose} 
              className="flex-1 h-9 px-4 text-[14px] font-medium text-black/60 hover:bg-black/5 rounded transition-all"
            >
              Hủy bỏ
            </button>
            <button type="submit" className="flex-1 notion-btn-primary">Tạo không gian</button>
          </div>
        </form>
      </div>
    </div>
  );
};
