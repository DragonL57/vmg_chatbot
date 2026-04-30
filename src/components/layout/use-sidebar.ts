'use client';

import { useState } from 'react';
import { MessageSquareText, UserCircle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams, useParams } from 'next/navigation';
import type { ChatHistory, NavItem } from './sidebar-sections';

import { useSidebarUser } from './use-sidebar.user';
import { useHistoryState } from './use-sidebar.history';
import {
  useLogoutAction,
  useStarAction,
  useDeleteAction,
  useRenameActions,
  useMenuActions,
  useNavigationActions,
} from './use-sidebar.actions';

export type SidebarState = {
  pathname: string;
  currentSessionId: string | null;
  userInitial: string;
  userAvatar?: string;
  userName?: string;
  history: ChatHistory[];
  isLoadingHistory: boolean;
  isRenaming: boolean;
  activeMenuId: string | null;
  menuAnchor: DOMRect | null;
  editingId: string | null;
  editTitle: string;
  navItems: NavItem[];
  setEditTitle: (value: string) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleMenuClick: (event: React.MouseEvent, id: string) => void;
  handleSelectChat: (chatId: string) => void;
  handleHomeClick: () => void;
  handleLogout: () => Promise<void>;
  handleStar: (id: string, currentlyStarred: boolean) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  startRename: (chat: ChatHistory) => void;
  submitRename: () => Promise<void>;
  closeMenu: () => void;
};

export const useSidebarState = (onClose: () => void): SidebarState => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const currentSessionId = (params?.id as string) || searchParams.get('session');

  const { userInitial, userAvatar, userName } = useSidebarUser();
  const { history, setHistory, isLoadingHistory, fetchHistory } = useHistoryState();

  const [isRenaming, setIsRenaming] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleLogout = useLogoutAction(router);
  const handleStar = useStarAction(setHistory, fetchHistory);
  const handleDelete = useDeleteAction(history, setHistory, currentSessionId, router);
  
  const { startRename, submitRename, handleKeyDown } = useRenameActions(
    history,
    setHistory,
    editingId,
    setEditingId,
    editTitle,
    setEditTitle,
    isRenaming,
    setIsRenaming,
    setActiveMenuId
  );
  
  const { handleMenuClick, closeMenu } = useMenuActions(activeMenuId, setActiveMenuId, setMenuAnchor);
  const { handleHomeClick, handleSelectChat } = useNavigationActions(pathname, router, onClose);

  const navItems: NavItem[] = [
    { name: 'Trò chuyện mới', href: '/', icon: MessageSquareText },
    { name: 'Hồ sơ cá nhân', href: '/profile', icon: UserCircle },
  ];

  return {
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
  };
};
