'use client';

import React from 'react';
import { BrainCircuit, Trash2, Edit2, Check, X } from 'lucide-react';

export type Memory = {
  id: string;
  fact: string;
  category: string;
  createdAt: string;
};

const getCategoryLabel = (category: string) => {
  if (category === 'persona') return 'cá nhân';
  if (category === 'preference') return 'sở thích';
  if (category === 'entity') return 'thực thể';
  if (category === 'episodic') return 'sự kiện';
  return category;
};

type MemoryEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const MemoryEditor = ({ value, onChange, onSave, onCancel }: MemoryEditorProps) => (
  <div className="flex items-center gap-2 pr-4">
    <input
      autoFocus
      className="flex-1 bg-black/[0.03] border border-black/[0.05] rounded-md px-2 py-1 text-[14px] font-medium outline-none focus:border-[#D32F2F]/20"
      value={value}
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') onSave();
        if (event.key === 'Escape') onCancel();
      }}
    />
    <button onClick={onSave} className="p-1 text-green-600 hover:bg-green-50 rounded" aria-label="Lưu thay đổi">
      <Check className="w-3.5 h-3.5" />
    </button>
    <button onClick={onCancel} className="p-1 text-black/20 hover:bg-black/5 rounded" aria-label="Hủy bỏ">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);

type MemoryRowProps = {
  memory: Memory;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: (memory: Memory) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

const MemoryRow = ({
  memory, isEditing, editValue, onEditValueChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: MemoryRowProps) => (
  <div className="grid grid-cols-[100px_1fr_80px] items-center px-4 py-3 group hover:bg-black/[0.01] transition-colors min-h-[56px]">
    <span className="text-[11px] font-bold text-black/40 tracking-tight">{getCategoryLabel(memory.category)}</span>
    {isEditing ? (
      <MemoryEditor value={editValue} onChange={onEditValueChange} onSave={() => onSaveEdit(memory.id)} onCancel={onCancelEdit} />
    ) : (
      <span className="text-[14px] font-medium text-black/80 leading-relaxed pr-4 line-clamp-2">{memory.fact}</span>
    )}
    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {!isEditing && (
        <>
          <button onClick={() => onStartEdit(memory)} className="p-1.5 text-black/10 hover:text-black/40 transition-colors" aria-label="Chỉnh sửa tri thức">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(memory.id)} className="p-1.5 text-black/10 hover:text-[#D32F2F] transition-colors" aria-label="Xóa tri thức">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  </div>
);

type MemorySectionProps = {
  memories: Memory[];
  editingId: string | null;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: (memory: Memory) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

const MemoryTable = ({ memories, editingId, editValue, onEditValueChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: MemorySectionProps) => (
  <div className="divide-y divide-black/[0.04]">
    <div className="grid grid-cols-[100px_1fr_80px] px-4 py-2.5 bg-black/[0.01] text-[11px] font-bold text-black/30 tracking-tight">
      <span>Loại</span>
      <span>Nội dung được ghi nhớ</span>
      <span className="text-right">Thao tác</span>
    </div>
    {memories.map(memory => (
      <MemoryRow key={memory.id} memory={memory} isEditing={editingId === memory.id} editValue={editValue}
        onEditValueChange={onEditValueChange} onStartEdit={onStartEdit} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit} onDelete={onDelete} />
    ))}
  </div>
);

export const MemorySection = ({ memories, editingId, editValue, onEditValueChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: MemorySectionProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-black/40" />
        <h2 className="text-[17px] font-bold text-black/80">Tri thức MATE đã ghi nhớ</h2>
      </div>
      <span className="text-[11px] font-bold text-black/20 uppercase tracking-widest">{memories.length} bản ghi</span>
    </div>
    <div className="bg-white rounded-[12px] border border-black/[0.08] overflow-hidden shadow-sm">
      {memories.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <p className="text-[14px] text-black/30 font-medium italic">MATE chưa có tri thức đặc biệt nào về bạn.</p>
        </div>
      ) : (
        <MemoryTable memories={memories} editingId={editingId} editValue={editValue}
          onEditValueChange={onEditValueChange} onStartEdit={onStartEdit} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit} onDelete={onDelete} />
      )}
    </div>
    <p className="px-2 text-[11px] text-black/30 leading-relaxed italic">
      * Tri thức này giúp MATE cá nhân hóa câu trả lời dựa trên vai trò và sở thích của bạn. Bạn có quyền kiểm soát và xóa bất kỳ thông tin nào MATE đã ghi nhớ.
    </p>
  </div>
);
