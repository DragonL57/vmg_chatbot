'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { slugify } from '@/core/lib/utils';
import { type KnowledgeCollection, type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';
import { useIndexingPoll } from '@/hooks/use-indexing-poll';
import { createSupabaseClient, fetchCollections, fetchFiles } from './silo-detail-utils';

type SiloDetailState = {
  activeSilo: KnowledgeCollection | null;
  files: KnowledgeFile[];
  filteredFiles: KnowledgeFile[];
  loading: boolean;
  saving: boolean;
  uploading: boolean;
  selectedFile: File | null;
  searchQuery: string;
  siloName: string;
  siloDesc: string;
  supabase: SupabaseClient | null;
};

type SiloDetailActions = {
  setSelectedFile: (file: File | null) => void;
  setSearchQuery: (value: string) => void;
  setSiloName: (value: string) => void;
  setSiloDesc: (value: string) => void;
  fetchSiloData: () => void;
  handleSaveSiloMetadata: () => Promise<void>;
  handleRegenerateSiloDescription: () => Promise<void>;
  handleDeleteSilo: () => Promise<void>;
  handleUpload: () => Promise<void>;
  handleDeleteFile: (fileId: string) => Promise<void>;
};

const useSiloState = () => {
  const [activeSilo, setActiveSilo] = useState<KnowledgeCollection | null>(null);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [siloName, setSiloName] = useState('');
  const [siloDesc, setSiloDesc] = useState('');

  return {
    activeSilo,
    setActiveSilo,
    files,
    setFiles,
    loading,
    setLoading,
    saving,
    setSaving,
    uploading,
    setUploading,
    selectedFile,
    setSelectedFile,
    searchQuery,
    setSearchQuery,
    siloName,
    setSiloName,
    siloDesc,
    setSiloDesc,
  };
};

const useSiloRefresh = (
  id: string,
  setActiveSilo: React.Dispatch<React.SetStateAction<KnowledgeCollection | null>>,
  setSiloName: React.Dispatch<React.SetStateAction<string>>,
  setSiloDesc: React.Dispatch<React.SetStateAction<string>>,
  setFiles: React.Dispatch<React.SetStateAction<KnowledgeFile[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(() => {
    setLoading(true);
    Promise.all([fetchCollections(), fetchFiles()])
      .then(([colData, fileData]) => {
        const currentSilo = colData.collections?.find(collection => collection.id === id) ?? null;
        if (currentSilo) {
          setActiveSilo(currentSilo);
          setSiloName(currentSilo.name);
          setSiloDesc(currentSilo.description ?? '');
          const siloFiles = fileData.files?.filter(file => file.collectionKey === currentSilo.collectionKey) ?? [];
          setFiles(siloFiles);
        }
      })
      .catch(() => {
        toast.error('Lỗi khi tải không gian tri thức');
      })
      .finally(() => setLoading(false));
  }, [id, setActiveSilo, setFiles, setLoading, setSiloDesc, setSiloName]);

const useSiloSave = (
  id: string,
  siloName: string,
  siloDesc: string,
  refresh: () => void,
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siloName, description: siloDesc }),
      });
      if (res.ok) {
        refresh();
        toast.success('Đã lưu thông tin không gian tri thức');
      } else {
        toast.error('Lỗi khi lưu thông tin');
      }
    } catch {
      toast.error('Lỗi khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  }, [id, refresh, setSaving, siloDesc, siloName]);

const useSiloRegenerate = (
  id: string,
  activeSilo: KnowledgeCollection | null,
  refresh: () => void,
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(async () => {
    if (!activeSilo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionKey: activeSilo.collectionKey }),
      });
      if (res.ok) {
        refresh();
        toast.success('Đã cập nhật mô tả bằng AI');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Lỗi khi tạo mô tả');
      }
    } catch {
      toast.error('Lỗi khi kết nối với AI');
    } finally {
      setSaving(false);
    }
  }, [activeSilo, id, refresh, setSaving]);

const useSiloDelete = (id: string) =>
  useCallback(async () => {
    if (!confirm('Xóa toàn bộ không gian tri thức này và tất cả tài liệu bên trong?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa không gian tri thức');
      } else {
        toast.error('Lỗi khi xóa không gian tri thức');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }, [id]);

const useSiloUpload = (
  activeSilo: KnowledgeCollection | null,
  selectedFile: File | null,
  supabase: SupabaseClient | null,
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>,
  setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  refresh: () => void
) =>
  useCallback(async () => {
    if (!selectedFile || !activeSilo || !supabase) return;
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${slugify(selectedFile.name.split('.')[0])}.${fileExt}`;
      const filePath = `sources/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('knowledge-sources').upload(filePath, selectedFile);
      if (uploadError) throw new Error(uploadError.message);

      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile.name, storagePath: filePath, mode: activeSilo.collectionKey }),
      });

      if (res.status === 202) {
        toast.success('Đã tải lên tài liệu, hệ thống đang bắt đầu xử lý');
        setSelectedFile(null);
        refresh();
      } else {
        toast.error('Lỗi khi bắt đầu xử lý tài liệu');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi khi tải lên tài liệu';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [activeSilo, refresh, selectedFile, setSelectedFile, setUploading, supabase]);

const useSiloFileDelete = (refresh: () => void) =>
  useCallback(async (fileId: string) => {
    if (!confirm('Xác nhận xóa tài liệu này?')) return;
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        refresh();
        toast.success('Đã xóa tài liệu');
      } else {
        toast.error('Lỗi khi xóa tài liệu');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }, [refresh]);

const useFilteredFiles = (files: KnowledgeFile[], searchQuery: string) =>
  useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(file => file.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

export const useSiloDetail = (id: string): SiloDetailState & SiloDetailActions => {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const {
    activeSilo,
    setActiveSilo,
    files,
    setFiles,
    loading,
    setLoading,
    saving,
    setSaving,
    uploading,
    setUploading,
    selectedFile,
    setSelectedFile,
    searchQuery,
    setSearchQuery,
    siloName,
    setSiloName,
    siloDesc,
    setSiloDesc,
  } = useSiloState();

  const fetchSiloData = useSiloRefresh(
    id,
    setActiveSilo,
    setSiloName,
    setSiloDesc,
    setFiles,
    setLoading
  );

  useEffect(() => {
    queueMicrotask(() => fetchSiloData());
  }, [fetchSiloData]);

  useIndexingPoll(files.some(f => f.status === 'indexing'), () =>
    Promise.all([fetchCollections(), fetchFiles()]).then(([colData, fileData]) => {
      const silo = colData.collections?.find(c => c.id === id) ?? null;
      if (silo) {
        const siloFiles = fileData.files?.filter(f => f.collectionKey === silo.collectionKey) ?? [];
        setFiles(siloFiles);
        return siloFiles.find(f => f.status === 'indexing')?.progress;
      }
    })
  );

  const handleSaveSiloMetadata = useSiloSave(id, siloName, siloDesc, fetchSiloData, setSaving);
  const handleRegenerateSiloDescription = useSiloRegenerate(id, activeSilo, fetchSiloData, setSaving);
  const handleDeleteSilo = useSiloDelete(id);
  const handleUpload = useSiloUpload(activeSilo, selectedFile, supabase, setSelectedFile, setUploading, fetchSiloData);
  const handleDeleteFile = useSiloFileDelete(fetchSiloData);
  const filteredFiles = useFilteredFiles(files, searchQuery);

  return {
    activeSilo,
    files,
    filteredFiles,
    loading,
    saving,
    uploading,
    selectedFile,
    searchQuery,
    siloName,
    siloDesc,
    supabase,
    setSelectedFile,
    setSearchQuery,
    setSiloName,
    setSiloDesc,
    fetchSiloData,
    handleSaveSiloMetadata,
    handleRegenerateSiloDescription,
    handleDeleteSilo,
    handleUpload,
    handleDeleteFile,
  };
};
