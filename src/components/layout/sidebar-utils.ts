'use client';

import type { User } from '@supabase/supabase-js';
import type { ChatHistory } from './sidebar-sections';

export const sortHistoryByPriority = (items: ChatHistory[]) =>
  items.sort((a, b) => {
    if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

export const toggleStarInHistory = (items: ChatHistory[], id: string, currentlyStarred: boolean) =>
  sortHistoryByPriority(
    items.map(item => (item.id === id ? { ...item, isStarred: currentlyStarred ? 0 : 1 } : item))
  );

export const restoreStarInHistory = (items: ChatHistory[], id: string, currentlyStarred: boolean) =>
  sortHistoryByPriority(
    items.map(item => (item.id === id ? { ...item, isStarred: currentlyStarred ? 1 : 0 } : item))
  );

export const getUserInitial = (user: User | null) => {
  if (!user) return 'U';
  const name = user.user_metadata?.full_name;
  if (name) return name.charAt(0);
  const email = user.email;
  return email ? email.charAt(0).toUpperCase() : 'U';
};

export const getUserName = (user: User | null) => {
  if (!user) return undefined;
  const name = user.user_metadata?.full_name;
  if (name) return name;
  const email = user.email;
  return email ? email.split('@')[0] : undefined;
};

export const getUserAvatar = (user: User | null) => user?.user_metadata?.avatar_url;
