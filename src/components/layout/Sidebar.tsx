'use client';

import React from 'react';
import {
  SidebarHeader,
  SidebarNav,
  SidebarUserWorkspace,
} from './sidebar-sections';
import { SidebarHistory } from './sidebar-history';
import { useSidebarState } from './use-sidebar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    pathname,
    currentSessionId,
    userInitial,
    userAvatar,
    userName,
    history,
    isLoadingHistory,
    isRenaming,
    activeMenuId,
    menuAnchor,
    editingId,
    editTitle,
    navItems,
    setEditTitle,
    handleKeyDown,
    handleMenuClick,
    handleSelectChat,
    handleHomeClick,
    handleLogout,
    handleStar,
    handleDelete,
    startRename,
    submitRename,
    closeMenu,
  } = useSidebarState(onClose);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <button 
          className="fixed inset-0 bg-black/[0.05] backdrop-blur-[1px] z-40 md:hidden animate-in fade-in duration-300 w-full h-full cursor-default border-none p-0" 
          onClick={onClose}
          aria-label="Đóng thanh bên"
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed top-0 left-0 h-full w-[240px] bg-[#f6f5f4] z-50 transition-all duration-300 transform border-r border-black/[0.05] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <SidebarHeader onClose={onClose} onHomeClick={handleHomeClick} />
        <SidebarNav navItems={navItems} pathname={pathname} currentSessionId={currentSessionId} onClose={onClose} />
        <SidebarHistory
          history={history}
          isLoading={isLoadingHistory}
          editingId={editingId}
          editTitle={editTitle}
          isRenaming={isRenaming}
          currentSessionId={currentSessionId}
          activeMenuId={activeMenuId}
          menuAnchor={menuAnchor}
          onEditTitleChange={setEditTitle}
          onKeyDown={handleKeyDown}
          onSubmitRename={submitRename}
          onStartRename={startRename}
          onMenuClick={handleMenuClick}
          onSelectChat={handleSelectChat}
          onCloseMenu={closeMenu}
          onStar={handleStar}
          onDelete={handleDelete}
        />
        <SidebarUserWorkspace
          userAvatar={userAvatar}
          userName={userName}
          userInitial={userInitial}
          pathname={pathname}
          onClose={onClose}
          onLogout={handleLogout}
        />
      </aside>
    </>
  );
};
