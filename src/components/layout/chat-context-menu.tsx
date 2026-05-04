'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Star, Edit2, Trash2 } from 'lucide-react';
import type { ChatHistory } from './sidebar-sections';

interface ChatContextMenuProps {
  chat: ChatHistory;
  anchorRect: DOMRect;
  onClose: () => void;
  onStar: (id: string, starred: boolean) => void;
  onRename: (chat: ChatHistory) => void;
  onDelete: (id: string) => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  chat,
  anchorRect,
  onClose,
  onStar,
  onRename,
  onDelete,
}) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        className="fixed inset-0 z-[9998] cursor-default w-full h-full bg-transparent border-none p-0"
        onClick={onClose}
        aria-label="Đóng menu"
      />
      <div
        className="fixed z-[9999] w-32 bg-white rounded-md shadow-lg border border-black/[0.08] py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{
          top: `${anchorRect.bottom + 4}px`,
          left: `${anchorRect.right - 128}px`,
        }}
      >
        <button
          onClick={() => { onStar(chat.id, !!chat.isStarred); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-black/70 hover:bg-black/5 text-left border-none"
        >
          <Star className={`w-3.5 h-3.5 ${chat.isStarred ? 'text-amber-500 fill-current' : ''}`} />
          {chat.isStarred ? 'Bỏ dấu sao' : 'Đánh dấu sao'}
        </button>
        <button
          onClick={() => { onRename(chat); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-black/70 hover:bg-black/5 text-left border-none"
        >
          <Edit2 className="w-3.5 h-3.5" /> Đổi tên
        </button>
        <div className="h-px bg-black/[0.05] my-1" />
        <button
          onClick={() => { onDelete(chat.id); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 text-left border-none"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa
        </button>
      </div>
    </>,
    document.body
  );
};
