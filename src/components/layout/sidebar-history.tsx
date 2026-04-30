'use client';

import React from 'react';
import { MessageSquare, MoreVertical, Star, Check } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';
import { ChatContextMenu, type ChatHistory } from './sidebar-sections';

type SidebarHistoryProps = {
  history: ChatHistory[];
  isLoading: boolean;
  editingId: string | null;
  editTitle: string;
  isRenaming: boolean;
  currentSessionId: string | null;
  activeMenuId: string | null;
  menuAnchor: DOMRect | null;
  onEditTitleChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmitRename: () => void;
  onStartRename: (chat: ChatHistory) => void;
  onMenuClick: (event: React.MouseEvent, id: string) => void;
  onSelectChat: (id: string) => void;
  onCloseMenu: () => void;
  onStar: (id: string, starred: boolean) => void;
  onDelete: (id: string) => void;
};

type HistoryEditRowProps = {
  editTitle: string;
  isRenaming: boolean;
  onEditTitleChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmitRename: () => void;
};

const HistoryLoading = () => (
  <div className="px-3 py-2 space-y-2">
    <div className="h-4 bg-black/5 rounded animate-pulse w-3/4" />
    <div className="h-4 bg-black/5 rounded animate-pulse w-1/2" />
  </div>
);

const HistoryEmpty = () => (
  <p className="px-3 text-[12px] text-black/30 italic">Chưa có hội thoại nào</p>
);

const HistoryEditRow = ({
  editTitle,
  isRenaming,
  onEditTitleChange,
  onKeyDown,
  onSubmitRename,
}: HistoryEditRowProps) => (
  <div className="flex items-center gap-2 px-3 h-8 bg-black/[0.04] rounded-[4px]">
    <input
      autoFocus
      disabled={isRenaming}
      className="bg-transparent text-[13px] w-full outline-none disabled:opacity-50"
      value={editTitle}
      onChange={event => onEditTitleChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
    <button
      disabled={isRenaming}
      onMouseDown={event => {
        event.preventDefault();
        onSubmitRename();
      }}
      className="disabled:opacity-30 p-1"
      aria-label="Lưu tên mới"
    >
      <Check className="w-3.5 h-3.5 text-green-600" />
    </button>
  </div>
);

type HistoryRowProps = {
  chat: ChatHistory;
  isActive: boolean;
  activeMenuId: string | null;
  menuAnchor: DOMRect | null;
  onSelectChat: (id: string) => void;
  onMenuClick: (event: React.MouseEvent, id: string) => void;
  onCloseMenu: () => void;
  onStar: (id: string, starred: boolean) => void;
  onStartRename: (chat: ChatHistory) => void;
  onDelete: (id: string) => void;
};

const HistoryRow = ({
  chat,
  isActive,
  activeMenuId,
  menuAnchor,
  onSelectChat,
  onMenuClick,
  onCloseMenu,
  onStar,
  onStartRename,
  onDelete,
}: HistoryRowProps) => (
  <>
    <button
      onClick={() => onSelectChat(chat.id)}
      className={`w-full flex items-center gap-2.5 px-3 h-8 rounded-[4px] text-[13px] transition-all text-left border-none ${
        isActive ? 'bg-black/[0.06] text-black font-semibold' : 'text-black/60 hover:bg-black/5 hover:text-black/90'
      }`}
    >
      {chat.isStarred ? (
        <Star className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
      ) : (
        <MessageSquare className="w-3.5 h-3.5 text-black/30 shrink-0" />
      )}
      <span className="truncate flex-1 pr-6">{chat.title}</span>
    </button>

    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
      <Tooltip content="Thao tác">
        <button
          onClick={event => onMenuClick(event, chat.id)}
          aria-label="Menu thao tác"
          className={`p-1 rounded hover:bg-black/10 transition-opacity border-none ${
            activeMenuId === chat.id ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
          }`}
        >
          <MoreVertical className="w-3.5 h-3.5 text-black/40" />
        </button>
      </Tooltip>
    </div>

    {activeMenuId === chat.id && menuAnchor && (
      <ChatContextMenu
        chat={chat}
        anchorRect={menuAnchor}
        onClose={onCloseMenu}
        onStar={onStar}
        onRename={onStartRename}
        onDelete={onDelete}
      />
    )}
  </>
);

type HistoryListProps = {
  history: ChatHistory[];
  currentSessionId: string | null;
  editingId: string | null;
  editTitle: string;
  isRenaming: boolean;
  activeMenuId: string | null;
  menuAnchor: DOMRect | null;
  onEditTitleChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmitRename: () => void;
  onStartRename: (chat: ChatHistory) => void;
  onMenuClick: (event: React.MouseEvent, id: string) => void;
  onSelectChat: (id: string) => void;
  onCloseMenu: () => void;
  onStar: (id: string, starred: boolean) => void;
  onDelete: (id: string) => void;
};

const HistoryList = ({
  history,
  currentSessionId,
  editingId,
  editTitle,
  isRenaming,
  activeMenuId,
  menuAnchor,
  onEditTitleChange,
  onKeyDown,
  onSubmitRename,
  onStartRename,
  onMenuClick,
  onSelectChat,
  onCloseMenu,
  onStar,
  onDelete,
}: HistoryListProps) => (
  <div className="space-y-0.5 pb-4">
    {history.map(chat => (
      <div key={chat.id} className="relative group/item">
        {editingId === chat.id ? (
          <HistoryEditRow
            editTitle={editTitle}
            isRenaming={isRenaming}
            onEditTitleChange={onEditTitleChange}
            onKeyDown={onKeyDown}
            onSubmitRename={onSubmitRename}
          />
        ) : (
          <HistoryRow
            chat={chat}
            isActive={currentSessionId === chat.id}
            activeMenuId={activeMenuId}
            menuAnchor={menuAnchor}
            onSelectChat={onSelectChat}
            onMenuClick={onMenuClick}
            onCloseMenu={onCloseMenu}
            onStar={onStar}
            onStartRename={onStartRename}
            onDelete={onDelete}
          />
        )}
      </div>
    ))}
  </div>
);

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  history,
  isLoading,
  editingId,
  editTitle,
  isRenaming,
  currentSessionId,
  activeMenuId,
  menuAnchor,
  onEditTitleChange,
  onKeyDown,
  onSubmitRename,
  onStartRename,
  onMenuClick,
  onSelectChat,
  onCloseMenu,
  onStar,
  onDelete,
}) => (
  <div className="flex-1 overflow-y-auto px-2 pb-10 min-h-0 custom-scrollbar">
    <div className="space-y-1 mt-2">
      <p className="px-3 text-[11px] font-bold text-black/30 mb-2 uppercase tracking-wider">Gần đây</p>
      {isLoading ? (
        <HistoryLoading />
      ) : history.length > 0 ? (
        <HistoryList
          history={history}
          currentSessionId={currentSessionId}
          editingId={editingId}
          editTitle={editTitle}
          isRenaming={isRenaming}
          activeMenuId={activeMenuId}
          menuAnchor={menuAnchor}
          onEditTitleChange={onEditTitleChange}
          onKeyDown={onKeyDown}
          onSubmitRename={onSubmitRename}
          onStartRename={onStartRename}
          onMenuClick={onMenuClick}
          onSelectChat={onSelectChat}
          onCloseMenu={onCloseMenu}
          onStar={onStar}
          onDelete={onDelete}
        />
      ) : (
        <HistoryEmpty />
      )}
    </div>
  </div>
);
