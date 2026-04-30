'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChatHistory } from './sidebar-sections';

export const useHistoryState = () => {
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
