'use client';

import { useEffect, useMemo, useState } from 'react';
import { type SupabaseClient } from '@supabase/supabase-js';
import { type KnowledgeCollection, type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';
import { useIndexingPoll } from '@/hooks/use-indexing-poll';
import { createSupabaseClient, fetchCollections, fetchFiles } from './silo-detail-utils';
import {
  useSiloRefresh,
  useSiloSave,
  useSiloRegenerate,
  useSiloDelete,
  useSiloUpload,
  useSiloFileDelete,
} from './use-silo-actions';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SiloDetailState = {
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

export type SiloDetailActions = {
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

// ─── State ──────────────────────────────────────────────────────────────────

function useSiloState() {
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
    activeSilo, setActiveSilo, files, setFiles,
    loading, setLoading, saving, setSaving, uploading, setUploading,
    selectedFile, setSelectedFile, searchQuery, setSearchQuery,
    siloName, setSiloName, siloDesc, setSiloDesc,
  };
}

function useFilteredFiles(files: KnowledgeFile[], searchQuery: string) {
  return useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(file => file.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);
}

// ─── Composer ───────────────────────────────────────────────────────────────

export function useSiloDetail(id: string): SiloDetailState & SiloDetailActions {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const {
    activeSilo, setActiveSilo, files, setFiles,
    loading, setLoading, saving, setSaving, uploading, setUploading,
    selectedFile, setSelectedFile, searchQuery, setSearchQuery,
    siloName, setSiloName, siloDesc, setSiloDesc,
  } = useSiloState();

  const fetchSiloData = useSiloRefresh(id, setActiveSilo, setSiloName, setSiloDesc, setFiles, setLoading);

  useEffect(() => { queueMicrotask(() => fetchSiloData()); }, [fetchSiloData]);

  useIndexingPoll(files.some(f => f.status === 'indexing'), () =>
    Promise.all([fetchCollections(), fetchFiles()]).then(([colData, fileData]) => {
      const silo = colData.collections?.find(c => c.id === id) ?? null;
      if (silo) {
        const siloFiles = fileData.files?.filter(f => f.collectionKey === silo.collectionKey) ?? [];
        setFiles(siloFiles);
        return siloFiles.find(f => f.status === 'indexing')?.progress;
      }
    }),
  );

  return {
    activeSilo, files, filteredFiles: useFilteredFiles(files, searchQuery),
    loading, saving, uploading, selectedFile, searchQuery, siloName, siloDesc, supabase,
    setSelectedFile, setSearchQuery, setSiloName, setSiloDesc, fetchSiloData,
    handleSaveSiloMetadata: useSiloSave(id, siloName, siloDesc, fetchSiloData, setSaving),
    handleRegenerateSiloDescription: useSiloRegenerate(id, activeSilo, fetchSiloData, setSaving),
    handleDeleteSilo: useSiloDelete(id),
    handleUpload: useSiloUpload(activeSilo, selectedFile, supabase, setSelectedFile, setUploading, fetchSiloData),
    handleDeleteFile: useSiloFileDelete(fetchSiloData),
  };
}
