'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/core/lib/supabase';
import { toast } from 'sonner';
import type { ChatHistory } from './sidebar-sections';
import {
  sortHistoryByPriority,
  toggleStarInHistory,
  restoreStarInHistory,
} from './sidebar-utils';

const postStarUpdate = async (id: string, isStarred: boolean) => {
  const res = await fetch(`/api/conversation/${id}/star`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isStarred }),
  });
  if (!res.ok) throw new Error();
};

export const useLogoutAction = (router: ReturnType<typeof useRouter>) =>
  useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    toast.success('Đã đăng xuất');
  }, [router]);

export const useStarAction = (
  setHistory: React.Dispatch<React.SetStateAction<ChatHistory[]>>, 
  fetchHistory: (silent?: boolean) => void
) =>
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

export const useDeleteAction = (
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

export const useRenameActions = (
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

export const useMenuActions = (
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

export const useNavigationActions = (
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
