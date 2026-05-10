'use client';

import { useCallback, useEffect, useState } from 'react';
import { slugify } from '@/core/lib/utils';
import { toast } from 'sonner';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/application/ports/knowledge-repository.port';

type SilosState = {
  collections: KnowledgeCollection[];
  files: KnowledgeFile[];
  loading: boolean;
  showColModal: boolean;
  newColName: string;
  newColQName: string;
  newColDesc: string;
};

type SilosActions = {
  setShowColModal: (value: boolean) => void;
  setNewColName: (value: string) => void;
  setNewColQName: (value: string) => void;
  setNewColDesc: (value: string) => void;
  fetchData: () => void;
  handleCreateCollection: () => Promise<void>;
  handleDeleteCollection: (id: string) => Promise<void>;
};

function useCreateCollection(
  state: { newColName: string; newColQName: string; newColDesc: string },
  setters: { 
    setNewColName: (v: string) => void; 
    setNewColQName: (v: string) => void; 
    setNewColDesc: (v: string) => void;
    setShowColModal: (v: boolean) => void;
  },
  fetchData: () => void
) {
  return useCallback(async () => {
    try {
      const safeId = state.newColQName || `vmg_docs_${slugify(state.newColName)}`;
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: state.newColName, collectionKey: safeId, description: state.newColDesc }),
      });
      if (res.ok) {
        setters.setNewColName('');
        setters.setNewColQName('');
        setters.setNewColDesc('');
        setters.setShowColModal(false);
        fetchData();
        toast.success('Đã tạo không gian tri thức');
      } else {
        toast.error('Lỗi khi tạo không gian tri thức');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }, [fetchData, state, setters]);
}

function useDeleteCollection(fetchData: () => void) {
  return useCallback(async (id: string) => {
    if (!confirm('Xóa không gian tri thức này?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast.success('Đã xóa không gian');
      } else {
        toast.error('Lỗi khi xóa không gian');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }, [fetchData]);
}

export const useSilos = (): SilosState & SilosActions => {
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColQName, setNewColQName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([fetch('/api/admin/collections'), fetch('/api/admin/files')])
      .then(async ([colRes, fileRes]) => {
        const colData = await colRes.json();
        const fileData = await fileRes.json();
        if (colData && Array.isArray(colData.collections)) setCollections(colData.collections);
        if (fileData && Array.isArray(fileData.files)) setFiles(fileData.files);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => fetchData());
  }, [fetchData]);

  const handleCreateCollection = useCreateCollection(
    { newColName, newColQName, newColDesc },
    { setNewColName, setNewColQName, setNewColDesc, setShowColModal },
    fetchData
  );

  const handleDeleteCollection = useDeleteCollection(fetchData);

  return {
    collections, files, loading, showColModal, newColName, newColQName, newColDesc,
    setShowColModal, setNewColName, setNewColQName, setNewColDesc, fetchData,
    handleCreateCollection, handleDeleteCollection
  };
};
