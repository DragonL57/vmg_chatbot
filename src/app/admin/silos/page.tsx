'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/application/ports/knowledge-repository.port';
import { slugify } from '@/core/lib/utils';
import { AdminHeader } from '@/components/admin/admin-header';
import { SiloTable } from '@/components/admin/silo-table';
import { CreateSiloModal } from '@/components/admin/create-silo-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SilosPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  
  const [newColName, setNewColName] = useState('');
  const [newColQName, setNewColQName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [colRes, fileRes] = await Promise.all([
        fetch('/api/admin/collections'),
        fetch('/api/admin/files')
      ]);
      const colData = await colRes.json();
      const fileData = await fileRes.json();
      if (colData && Array.isArray(colData.collections)) setCollections(colData.collections);
      if (fileData && Array.isArray(fileData.files)) setFiles(fileData.files);
    } catch (err) {}
    finally { setLoading(false); }
  }

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    try {
      const safeId = newColQName || `vmg_docs_${slugify(newColName)}`;
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColName, qdrant_name: safeId, description: newColDesc }),
      });
      if (res.ok) {
        setNewColName(''); setNewColQName(''); setNewColDesc('');
        setShowColModal(false);
        fetchData();
        toast.success('Đã tạo không gian tri thức');
      } else {
        toast.error('Lỗi khi tạo không gian tri thức');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  }

  async function handleRenameCollection(id: string, name: string) {
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        fetchData();
        toast.success('Đã đổi tên không gian');
      } else {
        toast.error('Lỗi khi đổi tên');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  }

  async function handleUpdateDescription(id: string, description: string) {
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        fetchData();
        toast.success('Đã cập nhật mô tả');
      } else {
        toast.error('Lỗi khi cập nhật mô tả');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm('Xóa không gian tri thức này?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast.success('Đã xóa không gian');
      } else {
        toast.error('Lỗi khi xóa không gian');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    }
  }

  return (
    <>
      <AdminHeader 
        view="silos" 
        onViewChange={(v) => v === 'files' ? null : {}} 
        onSidebarOpen={() => {}} // Controlled by layout
        onSync={fetchData} loading={loading}
        onLogout={() => { localStorage.removeItem('vmg_admin_auth'); window.location.reload(); }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[32px] font-bold tracking-tight mb-1.5">Quản lý kho tri thức</h1>
                <p className="text-[16px] text-[#615d59]">Tổ chức và quản lý các không gian dữ liệu riêng biệt cho AI.</p>
              </div>
              <button onClick={() => setShowColModal(true)} className="notion-btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Tạo không gian
              </button>
            </div>

            <SiloTable 
              collections={collections} files={files} 
              onSelectSilo={(s) => router.push(`/admin/silos/${s.id}`)}
              onRename={handleRenameCollection} 
              onUpdateDescription={handleUpdateDescription}
              onDelete={handleDeleteCollection}
            />
          </div>
        </div>
      </div>

      {showColModal && (
        <CreateSiloModal 
          name={newColName} onNameChange={setNewColName}
          qName={newColQName} onQNameChange={setNewColQName}
          desc={newColDesc} onDescChange={setNewColDesc}
          onSubmit={handleCreateCollection} onClose={() => setShowColModal(false)}
        />
      )}
    </>
  );
}
