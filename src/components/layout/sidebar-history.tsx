'use client';

import React from 'react';
import { type ChatHistory } from './sidebar-sections';
import { HistoryLoading, HistoryEmpty, HistoryList } from './sidebar-history-parts';

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

export const SidebarHistory: React.FC<SidebarHistoryProps> = (props) => {
  const { history, isLoading, editingId, editTitle, isRenaming, currentSessionId, activeMenuId, menuAnchor,
    onEditTitleChange, onKeyDown, onSubmitRename, onStartRename, onMenuClick, onSelectChat, onCloseMenu, onStar, onDelete } = props;

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-10 min-h-0 custom-scrollbar">
      <div className="space-y-1 mt-2">
        <p className="px-3 text-[11px] font-bold text-black/30 mb-2 uppercase tracking-wider">Gần đây</p>
        {isLoading ? (
          <HistoryLoading />
        ) : history.length > 0 ? (
          <HistoryList history={history} currentSessionId={currentSessionId} editingId={editingId}
            editTitle={editTitle} isRenaming={isRenaming} activeMenuId={activeMenuId} menuAnchor={menuAnchor}
            onEditTitleChange={onEditTitleChange} onKeyDown={onKeyDown} onSubmitRename={onSubmitRename}
            onStartRename={onStartRename} onMenuClick={onMenuClick} onSelectChat={onSelectChat}
            onCloseMenu={onCloseMenu} onStar={onStar} onDelete={onDelete} />
        ) : (
          <HistoryEmpty />
        )}
      </div>
    </div>
  );
};
