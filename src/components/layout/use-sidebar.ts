'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquareText, UserCircle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/core/lib/supabase';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import type { ChatHistory, NavItem } from './sidebar-sections';
import {
  sortHistoryByPriority,
  toggleStarInHistory,
  restoreStarInHistory,
  getUserInitial,
  getUserName,
  getUserAvatar,
} from './sidebar-utils';

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

const postStarUpdate = async (id: string, isStarred: boolean) => {
  const res = await fetch(`/api/conversation/${id}/star`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isStarred }),
  });
  if (!res.ok) throw new Error();
};

const useSidebarUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    queueMicrotask(fetchUser);
  }, []);

  const userInitial = getUserInitial(user);
  const userAvatar = getUserAvatar(user);
  const userName = getUserName(user);

  return { userInitial, userAvatar, userName };
};

const useHistoryState = () => {
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = useCallback((silent = false) => {
    if (!silent) setIsLoadingHistory(true);
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
      })
      .finally(() => {
        if (!silent) setIsLoadingHistory(false);
      });
  }, []);

  useEffect(() => {
    queueMicrotask(() => fetchHistory());
    const handleRefresh = () => fetchHistory(true);
    window.addEventListener('refresh-chat-history', handleRefresh);
    return () => window.removeEventListener('refresh-chat-history', handleRefresh);
  }, [fetchHistory]);

  return { history, setHistory, isLoadingHistory, fetchHistory };
};

const useLogoutAction = (router: ReturnType<typeof useRouter>) =>
  useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    toast.success('Đã đăng xuất');
  }, [router]);

const useStarAction = (setHistory: React.Dispatch<React.SetStateAction<ChatHistory[]>>, fetchHistory: (silent?: boolean) => void) =>
  useCallback(
    async (id: string, currentlyStarred: boolean) => {
      setHistory(prev => toggleStarInHistory(prev, id, currentlyStarred));

      try {
        await postStarUpdate(id, !currentlyStarred);
        fetchHistory(true);
      } catch {
        toast.error('Lỗi khi đánh dấu sao');
        setHistory(prev => restoreStarInHistory(prev, id, currentlyStarred));
      }
    },
    [fetchHistory, setHistory]
  );

const useDeleteAction = (
  history: ChatHistory[],
  setHistory: React.Dispatch<React.SetStateAction<ChatHistory[]>>,
  currentSessionId: string | null,
  router: ReturnType<typeof useRouter>
) =>
  useCallback(
    async (id: string) => {
      if (!confirm('Bạn có chắc muốn xóa cuộc hội thoại này?')) return;

      const itemToDelete = history.find(h => h.id === id);
      if (!itemToDelete) return;

      setHistory(prev => prev.filter(item => item.id !== id));
      if (currentSessionId === id) router.push('/');

      try {
        const res = await fetch(`/api/conversation/${id}/delete`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        toast.success('Đã xóa cuộc hội thoại');
      } catch {
        toast.error('Lỗi khi xóa');
        setHistory(prev => sortHistoryByPriority([...prev, itemToDelete]));
        if (currentSessionId === id) router.push(`/chat/${id}`);
      }
    },
    [currentSessionId, history, router, setHistory]
  );

const useRenameActions = (
  history: ChatHistory[],
  setHistory: React.Dispatch<React.SetStateAction<ChatHistory[]>>,
  editingId: string | null,
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>,
  editTitle: string,
  setEditTitle: React.Dispatch<React.SetStateAction<string>>,
  isRenaming: boolean,
  setIsRenaming: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveMenuId: React.Dispatch<React.SetStateAction<string | null>>
) => {
  const startRename = useCallback(
    (chat: ChatHistory) => {
      setEditingId(chat.id);
      setEditTitle(chat.title);
      setActiveMenuId(null);
    },
    [setActiveMenuId, setEditTitle, setEditingId]
  );

  const submitRename = useCallback(async () => {
    const idToSave = editingId;
    const titleToSave = editTitle.trim();
    if (!idToSave || !titleToSave || isRenaming) {
      setEditingId(null);
      return;
    }

    const originalItem = history.find(h => h.id === idToSave);
    if (!originalItem) return;

    setIsRenaming(true);
    setHistory(prev => prev.map(item => (item.id === idToSave ? { ...item, title: titleToSave } : item)));
    setEditingId(null);

    try {
      const res = await fetch(`/api/conversation/${idToSave}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave }),
      });
      if (!res.ok) throw new Error();
      toast.success('Đã đổi tên');
    } catch {
      toast.error('Lỗi khi đổi tên');
      setHistory(prev =>
        sortHistoryByPriority(
          prev.map(item => (item.id === idToSave ? { ...item, title: originalItem.title } : item))
        )
      );
    } finally {
      setIsRenaming(false);
    }
  }, [editTitle, editingId, history, isRenaming, setEditingId, setHistory, setIsRenaming]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitRename();
      } else if (event.key === 'Escape') {
        setEditingId(null);
      }
    },
    [setEditingId, submitRename]
  );

  return { startRename, submitRename, handleKeyDown, setEditTitle };
};

const useMenuActions = (
  activeMenuId: string | null,
  setActiveMenuId: React.Dispatch<React.SetStateAction<string | null>>,
  setMenuAnchor: React.Dispatch<React.SetStateAction<DOMRect | null>>
) => {
  const handleMenuClick = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.stopPropagation();
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuAnchor(rect);
      setActiveMenuId(activeMenuId === id ? null : id);
    },
    [activeMenuId, setActiveMenuId, setMenuAnchor]
  );

  const closeMenu = useCallback(() => setActiveMenuId(null), [setActiveMenuId]);

  return { handleMenuClick, closeMenu };
};

const useNavigationActions = (
  pathname: string,
  router: ReturnType<typeof useRouter>,
  onClose: () => void
) => {
  const handleHomeClick = useCallback(() => {
    if (pathname === '/') {
      window.location.href = '/';
    }
  }, [pathname]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      router.push(`/chat/${chatId}`);
      onClose();
    },
    [router, onClose]
  );

  return { handleHomeClick, handleSelectChat };
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
