'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type KnowledgeCollection, type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';

type FileResponse = {
  files?: KnowledgeFile[];
};

type CollectionResponse = {
  collections?: KnowledgeCollection[];
};

type FileDetailState = {
  file: KnowledgeFile | null;
  silo: KnowledgeCollection | null;
  loading: boolean;
  saving: boolean;
  filename: string;
  summary: string;
};

type FileDetailActions = {
  setFilename: (value: string) => void;
  setSummary: (value: string) => void;
  refresh: () => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleRegenerateSummary: () => Promise<void>;
};

const fetchCollections = async (): Promise<CollectionResponse> => {
  const res = await fetch('/api/admin/collections');
  return res.json();
};

const fetchFiles = async (): Promise<FileResponse> => {
  const res = await fetch('/api/admin/files');
  return res.json();
};

const useFileDetailState = () => {
  const [file, setFile] = useState<KnowledgeFile | null>(null);
  const [silo, setSilo] = useState<KnowledgeCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filename, setFilename] = useState('');
  const [summary, setSummary] = useState('');

  return {
    file,
    setFile,
    silo,
    setSilo,
    loading,
    setLoading,
    saving,
    setSaving,
    filename,
    setFilename,
    summary,
    setSummary,
  };
};

const useFileDetailRefresh = (
  siloId: string,
  fileId: string,
  setFile: React.Dispatch<React.SetStateAction<KnowledgeFile | null>>,
  setSilo: React.Dispatch<React.SetStateAction<KnowledgeCollection | null>>,
  setFilename: React.Dispatch<React.SetStateAction<string>>,
  setSummary: React.Dispatch<React.SetStateAction<string>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(() => {
    setLoading(true);
    Promise.all([fetchCollections(), fetchFiles()])
      .then(([colData, fileData]) => {
        const currentFile = fileData.files?.find(f => f.id === fileId) ?? null;
        const currentSilo = colData.collections?.find(c => c.id === siloId) ?? null;
        if (currentFile) {
          setFile(currentFile);
          setFilename(currentFile.filename);
          setSummary(currentFile.summary ?? '');
        }
        if (currentSilo) setSilo(currentSilo);
      })
      .catch(() => {
        toast.error('Lỗi khi tải dữ liệu');
      })
      .finally(() => setLoading(false));
  }, [fileId, setFile, setFilename, setLoading, setSilo, setSummary, siloId]);

const useSaveAction = (
  fileId: string,
  filename: string,
  summary: string,
  refresh: () => void,
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, summary }),
      });
      if (res.ok) {
        refresh();
        toast.success('Đã lưu thay đổi tài liệu');
      } else {
        toast.error('Lỗi khi lưu thay đổi');
      }
    } catch {
      toast.error('Lỗi khi lưu thay đổi');
    } finally {
      setSaving(false);
    }
  }, [fileId, filename, refresh, setSaving, summary]);

const useDeleteAction = (
  fileId: string,
  siloId: string,
  router: ReturnType<typeof useRouter>
) =>
  useCallback(async () => {
    if (!confirm('Xác nhận xóa tài liệu này?')) return;
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa tài liệu');
        router.push(`/admin/silos/${siloId}`);
      } else {
        toast.error('Lỗi khi xóa tài liệu');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }, [fileId, router, siloId]);

const useRegenerateAction = (
  fileId: string,
  filename: string,
  mode: string,
  refresh: () => void,
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/files/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, filename, mode }),
      });
      if (res.ok) {
        refresh();
        toast.success('Đã cập nhật tóm tắt bằng AI');
      } else {
        toast.error('Lỗi khi tạo tóm tắt');
      }
    } catch {
      toast.error('Lỗi khi tạo tóm tắt');
    } finally {
      setSaving(false);
    }
  }, [fileId, filename, mode, refresh, setSaving]);

export const useFileDetail = (siloId: string, fileId: string): FileDetailState & FileDetailActions => {
  const router = useRouter();
  const {
    file,
    setFile,
    silo,
    setSilo,
    loading,
    setLoading,
    saving,
    setSaving,
    filename,
    setFilename,
    summary,
    setSummary,
  } = useFileDetailState();

  const refresh = useFileDetailRefresh(
    siloId,
    fileId,
    setFile,
    setSilo,
    setFilename,
    setSummary,
    setLoading
  );

  useEffect(() => {
    queueMicrotask(() => refresh());
  }, [refresh]);

  const handleSave = useSaveAction(fileId, filename, summary, refresh, setSaving);
  const handleDelete = useDeleteAction(fileId, siloId, router);
  const handleRegenerateSummary = useRegenerateAction(fileId, filename, file?.mode ?? '', refresh, setSaving);

  return {
    file,
    silo,
    loading,
    saving,
    filename,
    summary,
    setFilename,
    setSummary,
    refresh,
    handleSave,
    handleDelete,
    handleRegenerateSummary,
  };
};
