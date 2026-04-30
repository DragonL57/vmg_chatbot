'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { type KnowledgeCollection, type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';

type CollectionsResponse = {
  collections?: KnowledgeCollection[];
};

type FilesResponse = {
  files?: KnowledgeFile[];
};

export const createSupabaseClient = (): SupabaseClient | null => {
  if (typeof window === 'undefined') return null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!url || !key || url === 'undefined' || key === 'undefined' || key.length < 40) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
};

export const fetchCollections = async (): Promise<CollectionsResponse> => {
  const res = await fetch('/api/admin/collections');
  return res.json();
};

export const fetchFiles = async (): Promise<FilesResponse> => {
  const res = await fetch('/api/admin/files');
  return res.json();
};
