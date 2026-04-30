'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import type { Memory } from './profile-sections';

type ProfileData = {
  user: User | null;
  memories: Memory[];
  isLoading: boolean;
  setMemories: React.Dispatch<React.SetStateAction<Memory[]>>;
};

type MemoryEditor = {
  editingId: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEdit: (memory: Memory) => void;
  cancelEdit: () => void;
  handleDeleteMemory: (id: string) => Promise<void>;
  handleUpdateMemory: (id: string) => Promise<void>;
};

const fetchMemories = async () => {
  const res = await fetch('/api/user/memories');
  const data = await res.json();
  return data && Array.isArray(data.memories) ? data.memories : [];
};

const deleteMemoryRequest = async (id: string) =>
  fetch('/api/user/memories', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memoryId: id }),
  });

const updateMemoryRequest = async (id: string, fact: string) =>
  fetch('/api/user/memories', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memoryId: id, fact }),
  });

export const useProfileData = (): ProfileData => {
  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        try {
          const loaded = await fetchMemories();
          setMemories(loaded);
        } catch {
          toast.error('Không thể tải tri thức người dùng');
        }
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  return { user, memories, isLoading, setMemories };
};

export const useMemoryEditor = (setMemories: React.Dispatch<React.SetStateAction<Memory[]>>): MemoryEditor => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback((memory: Memory) => {
    setEditingId(memory.id);
    setEditValue(memory.fact);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleDeleteMemory = useCallback(async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa tri thức này?')) return;
    try {
      const res = await deleteMemoryRequest(id);
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
        toast.success('Đã xóa tri thức');
      }
    } catch {
      toast.error('Lỗi khi xóa');
    }
  }, [setMemories]);

  const handleUpdateMemory = useCallback(async (id: string) => {
    const newVal = editValue.trim();
    if (!newVal) return;

    try {
      const res = await updateMemoryRequest(id, newVal);
      if (res.ok) {
        setMemories(prev => prev.map(m => (m.id === id ? { ...m, fact: newVal } : m)));
        setEditingId(null);
        toast.success('Đã cập nhật tri thức');
      }
    } catch {
      toast.error('Lỗi khi cập nhật');
    }
  }, [editValue, setMemories]);

  return {
    editingId,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    handleDeleteMemory,
    handleUpdateMemory,
  };
};
