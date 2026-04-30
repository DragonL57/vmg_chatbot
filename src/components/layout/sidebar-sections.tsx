'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Edit2, Trash2, LogOut, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Tooltip } from '../ui/tooltip';

export interface ChatHistory {
  id: string;
  title: string;
  isStarred: number;
  updatedAt: string;
}

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type ChatContextMenuProps = {
  chat: ChatHistory;
  anchorRect: DOMRect;
  onClose: () => void;
  onStar: (id: string, starred: boolean) => void;
  onRename: (chat: ChatHistory) => void;
  onDelete: (id: string) => void;
};

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
          onClick={() => {
            onStar(chat.id, !!chat.isStarred);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-black/70 hover:bg-black/5 text-left border-none"
        >
          <Star className={`w-3.5 h-3.5 ${chat.isStarred ? 'text-amber-500 fill-current' : ''}`} />
          {chat.isStarred ? 'Bỏ dấu sao' : 'Đánh dấu sao'}
        </button>
        <button
          onClick={() => {
            onRename(chat);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-black/70 hover:bg-black/5 text-left border-none"
        >
          <Edit2 className="w-3.5 h-3.5" /> Đổi tên
        </button>
        <div className="h-px bg-black/[0.05] my-1" />
        <button
          onClick={() => {
            onDelete(chat.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 text-left border-none"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa
        </button>
      </div>
    </>,
    document.body
  );
};

type SidebarHeaderProps = {
  onClose: () => void;
  onHomeClick: () => void;
};

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onClose, onHomeClick }) => (
  <div className="h-14 flex items-center justify-between px-4 shrink-0">
    <Link
      href="/"
      className="flex items-center gap-2 group"
      onClick={() => {
        onHomeClick();
        onClose();
      }}
    >
      <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-all">
        <Image src="/apple-icon.svg" alt="VMG" width={32} height={32} />
      </div>
      <h2 className="text-[14px] font-bold text-black/80 truncate">MATE</h2>
    </Link>
    <button 
      onClick={onClose} 
      className="p-1.5 text-black/40 hover:text-black/60 md:hidden hover:bg-black/5 rounded"
      aria-label="Đóng thanh bên"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

type SidebarNavProps = {
  navItems: NavItem[];
  pathname: string;
  currentSessionId: string | null;
  onClose: () => void;
};

export const SidebarNav: React.FC<SidebarNavProps> = ({ navItems, pathname, currentSessionId, onClose }) => (
  <div className="px-2 py-4 space-y-4 shrink-0">
    <nav className="space-y-0.5">
      {navItems.map(item => {
        const isActive = pathname === item.href && !currentSessionId;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => onClose()}
            className={`flex items-center gap-2.5 px-3 h-8 rounded-[4px] text-[14px] font-medium transition-all ${
              isActive
                ? 'bg-black/[0.06] text-black'
                : 'text-black/60 hover:bg-black/5 hover:text-black/90'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-[#D32F2F]' : 'text-black/40'}`} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  </div>
);

type SidebarUserWorkspaceProps = {
  userAvatar?: string;
  userName?: string;
  userInitial: string;
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
};

export const SidebarUserWorkspace: React.FC<SidebarUserWorkspaceProps> = ({
  userAvatar,
  userName,
  userInitial,
  pathname,
  onClose,
  onLogout,
}) => (
  <div className="p-2 mt-auto border-t border-black/[0.05] space-y-1 bg-[#f6f5f4] z-10">
    <div className="flex items-center gap-1 group">
      <Link
        href="/profile"
        onClick={() => onClose()}
        aria-label="Xem hồ sơ cá nhân"
        className={`flex-1 flex items-center gap-3 p-2 rounded-[4px] hover:bg-black/5 transition-colors ${
          pathname === '/profile' ? 'bg-black/[0.04]' : ''
        }`}
      >
        <div className="w-7 h-7 rounded-[6px] bg-[#D32F2F] flex items-center justify-center text-white text-[11px] font-bold shadow-sm overflow-hidden shrink-0">
          {userAvatar ? (
            <Image src={userAvatar} alt={userName ?? 'User'} width={28} height={28} className="object-cover" />
          ) : (
            userInitial
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-black/80 truncate">{userName}</p>
          <p className="text-[10px] text-black/40 font-medium">MATE Workspace</p>
        </div>
      </Link>

      <Tooltip content="Đăng xuất">
        <button
          onClick={() => onLogout()}
          aria-label="Đăng xuất"
          className="p-1.5 text-black/30 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 border-none"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
    </div>
  </div>
);
