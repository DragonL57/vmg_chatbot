'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { Search, ChevronLeft, HardDrive, Check, Loader2, Database, Trash2, Sparkles } from 'lucide-react';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/services/supabase.service';
import { AdminHeader } from '@/components/admin/admin-header';
import { FileTable } from '@/components/admin/file-table';
import { UploadPanel } from '@/components/admin/upload-panel';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { slugify } from '@/core/lib/utils';

interface SiloDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SiloDetailPage({ params }: SiloDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const [activeSilo, setActiveSilo] = useState<KnowledgeCollection | null>(null);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editable Silo Metadata
  const [siloName, setSiloName] = useState('');
  const [siloDesc, setSiloDesc] = useState('');

  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_KEY;
    if (!url || !key || url === 'undefined' || key === 'undefined' || key.length < 40) return null;
    try {
      return createClient(url, key, { auth: { persistSession: false } });
    } catch (e) { return null; }
  }, []);

  useEffect(() => {
    fetchSiloData();
  }, [id]);

  async function fetchSiloData() {
    setLoading(true);
    try {
      const [colRes, fileRes] = await Promise.all([
        fetch('/api/admin/collections'),
        fetch('/api/admin/files')
      ]);
      const cols = await colRes.json();
      const allFiles = await fileRes.json();
      
      const currentSilo = cols.find((c: any) => c.id === id);
      if (currentSilo) {
        setActiveSilo(currentSilo);
        setSiloName(currentSilo.name);
        setSiloDesc(currentSilo.description || '');
        setFiles(allFiles.filter((f: any) => f.mode === currentSilo.qdrantName));
      }
    } catch (err) {}
    finally { setLoading(false); }
  }

  async function handleSaveSiloMetadata() {
    setSaving(true);
    try {
      await fetch(`/api/admin/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siloName, description: siloDesc }),
      });
      fetchSiloData();
    } catch (err) {
      alert('Lỗi khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateSiloDescription() {
    if (!activeSilo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}/generate-description`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qdrantName: activeSilo.qdrantName })
      });
      if (res.ok) fetchSiloData();
      else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi tạo mô tả');
      }
    } catch (error) {
      alert('Lỗi khi kết nối với AI');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSilo() {
    if (!confirm('Xóa toàn bộ không gian tri thức này và tất cả tài liệu bên trong?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/admin/silos');
    } catch (error) {}
  }

  async function handleUpload() {
    if (!selectedFile || !activeSilo || !supabase) return;
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${slugify(selectedFile.name.split('.')[0])}.${fileExt}`;
      const filePath = `sources/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('knowledge-sources').upload(filePath, selectedFile);
      if (uploadError) throw new Error(uploadError.message);
      
      const res = await fetch('/api/admin/ingest', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile.name, storagePath: filePath, mode: activeSilo.qdrantName })
      });
      
      if (res.status === 202) {
        setSelectedFile(null);
        fetchSiloData();
      }
    } catch (error: any) { alert(error.message); }
    finally { setUploading(false); }
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm('Xác nhận xóa tài liệu này?')) return;
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) fetchSiloData();
    } catch (error) {}
  }

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  if (loading && !activeSilo) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 animate-spin text-black/20" />
    </div>
  );

  return (
    <>
      <AdminHeader 
        view="files" activeSiloName={activeSilo?.name} 
        onViewChange={() => router.push('/admin/silos')}
        onSidebarOpen={() => {}}
        onSync={fetchSiloData} loading={loading}
        onLogout={() => { localStorage.removeItem('vmg_admin_auth'); window.location.reload(); }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="max-w-6xl mx-auto px-8 py-10 space-y-12">
          {/* Header Metadata Section */}
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <button onClick={() => router.push('/admin/silos')} className="flex items-center gap-1.5 text-[14px] font-medium text-black/40 hover:text-black/80 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleDeleteSilo} className="h-8 px-3 rounded-[4px] text-red-600 hover:bg-red-50 text-[13px] font-medium transition-all">Xóa không gian</button>
                <button onClick={handleSaveSiloMetadata} disabled={saving} className="notion-btn-primary flex items-center gap-2 h-8 px-4">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Lưu thông tin</>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                type="text" value={siloName} onChange={(e) => setSiloName(e.target.value)}
                placeholder="Tên không gian tri thức..."
                className="w-full text-[32px] font-bold bg-transparent border-none focus:outline-none placeholder:text-black/10 transition-all tracking-tight"
              />
              <div className="space-y-2 group relative">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-black/20 uppercase tracking-widest">Mô tả không gian</label>
                  <button 
                    onClick={handleRegenerateSiloDescription} 
                    className="text-[12px] font-bold text-[#D32F2F] hover:underline flex items-center gap-1.5"
                    title="AI sẽ tóm tắt nội dung từ tất cả file trong không gian này"
                  >
                    <Sparkles className="w-3 h-3" /> Viết lại bằng AI
                  </button>
                </div>
                <textarea 
                  value={siloDesc} onChange={(e) => setSiloDesc(e.target.value)}
                  placeholder="Thêm mô tả cho không gian tri thức này..."
                  rows={2}
                  className="w-full text-[16px] text-[#615d59] font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-black/[0.03] rounded-md p-1 -m-1 resize-none placeholder:text-black/10 transition-all leading-relaxed"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[11px] font-bold text-black/30 uppercase tracking-widest bg-black/[0.03] px-2 py-0.5 rounded">Identifier: {activeSilo?.qdrantName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start border-t border-black/[0.05] pt-10">
            {/* Upload Panel */}
            <div className="lg:col-span-4 sticky top-0">
              <UploadPanel 
                selectedFile={selectedFile} onFileSelect={setSelectedFile}
                onUpload={handleUpload} uploading={uploading} 
                disabled={!supabase}
              />
            </div>
            
            {/* File Management */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-1">
                 <h3 className="text-[12px] font-bold text-black/40 uppercase tracking-widest">Danh sách tài liệu ({files.length})</h3>
                 <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                   <input 
                     type="text" placeholder="Tìm tài liệu..." value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-black/[0.02] border border-black/[0.06] rounded-[6px] py-1.5 pl-9 pr-4 text-[13px] focus:bg-white focus:border-[#D32F2F]/30 outline-none transition-all shadow-sm"
                   />
                 </div>
              </div>
              <FileTable 
                siloId={id}
                files={filteredFiles} 
                onDelete={handleDeleteFile}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
