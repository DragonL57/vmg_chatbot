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

let cachedClient: SupabaseClient | null = null;

export const createSupabaseClient = (): SupabaseClient | null => {
  if (cachedClient) return cachedClient;
  if (typeof window === 'undefined') return null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!url || !key || url === 'undefined' || key === 'undefined' || key.length < 40) return null;
  try {
    cachedClient = createClient(url, key, { auth: { persistSession: false } });
    return cachedClient;
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
