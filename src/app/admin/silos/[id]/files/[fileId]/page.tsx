'use client';

import { useState, useEffect, use } from 'react';
import { ChevronLeft, Trash2, Check, Loader2, Sparkles, Database } from 'lucide-react';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/application/ports/knowledge-repository.port';
import { AdminHeader } from '@/components/admin/admin-header';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface FileDetailPageProps {
  params: Promise<{ id: string; fileId: string }>;
}

export default function FileDetailPage({ params }: FileDetailPageProps) {
  const router = useRouter();
  const { id: siloId, fileId } = use(params);
  
  const [file, setFile] = useState<KnowledgeFile | null>(null);
  const [silo, setSilo] = useState<KnowledgeCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [filename, setFilename] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    fetchData();
  }, [fileId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [colRes, fileRes] = await Promise.all([
        fetch('/api/admin/collections'),
        fetch('/api/admin/files')
      ]);
      const colData = await colRes.json();
      const fileData = await fileRes.json();
      
      const currentFile = fileData?.files?.find((f: any) => f.id === fileId);
      const currentSilo = colData?.collections?.find((c: any) => c.id === siloId);

      if (currentFile) {
        setFile(currentFile);
        setFilename(currentFile.filename);
        setSummary(currentFile.summary || '');
      }
      if (currentSilo) setSilo(currentSilo);
    } catch (err) {}
    finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, summary }),
      });
      if (res.ok) {
        fetchData();
        toast.success('Đã lưu thay đổi tài liệu');
      } else {
        toast.error('Lỗi khi lưu thay đổi');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu thay đổi');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Xác nhận xóa tài liệu này?')) return;
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa tài liệu');
        router.push(`/admin/silos/${siloId}`);
      } else {
        toast.error('Lỗi khi xóa tài liệu');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    }
  }

  async function handleRegenerateSummary() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/files/generate-summary`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId })
      });
      if (res.ok) {
        fetchData();
        toast.success('Đã cập nhật tóm tắt bằng AI');
      } else {
        toast.error('Lỗi khi tạo tóm tắt');
      }
    } catch (error) {
      toast.error('Lỗi khi tạo tóm tắt');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 animate-spin text-black/20" />
    </div>
  );

  return (
    <>
      <AdminHeader 
        view="files" activeSiloName={silo?.name} 
        onViewChange={() => router.push('/admin/silos')}
        onSidebarOpen={() => {}}
        onSync={fetchData} loading={loading}
        onLogout={() => { localStorage.removeItem('vmg_admin_auth'); window.location.reload(); }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Breadcrumb & Title */}
          <div className="space-y-4">
            <button onClick={() => router.push(`/admin/silos/${siloId}`)} className="flex items-center gap-1.5 text-[14px] font-medium text-black/40 hover:text-black/80 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Quay lại {silo?.name}
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-[32px] font-bold tracking-tight text-black/90">Chi tiết tài liệu</h1>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleDelete} className="h-9 px-4 rounded-[6px] text-red-600 hover:bg-red-50 font-medium text-[14px] transition-all">Xóa tài liệu</button>
                <button onClick={handleSave} disabled={saving} className="notion-btn-primary flex items-center gap-2 min-w-[100px] justify-center">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Lưu thay đổi</>}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-black/40 ml-1">Tên tài liệu</label>
                <input 
                  type="text" value={filename} onChange={(e) => setFilename(e.target.value)}
                  className="w-full text-[20px] font-semibold bg-transparent border-b border-black/[0.06] focus:border-[#D32F2F] outline-none pb-2 transition-all"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-black/40 ml-1">Tóm tắt tri thức (AI)</label>
                  <button onClick={handleRegenerateSummary} className="text-[12px] font-bold text-[#D32F2F] hover:underline flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Tạo lại tóm tắt
                  </button>
                </div>
                <textarea 
                  value={summary} onChange={(e) => setSummary(e.target.value)}
                  rows={8}
                  className="w-full text-[15px] leading-relaxed bg-[#f6f5f4] border border-black/[0.05] rounded-[8px] p-4 focus:bg-white focus:border-[#D32F2F]/30 outline-none transition-all resize-none"
                  placeholder="Nhập tóm tắt tri thức để AI hiểu tài liệu này tốt hơn..."
                />
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              <div className="notion-card p-5 space-y-4">
                <h4 className="text-[13px] font-bold text-black/40">Thông tin hệ thống</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-black/30">Trạng thái index</p>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${file?.status === 'completed' ? 'bg-[#1aae39]' : 'bg-red-500'}`}></div>
                       <span className="text-[14px] font-semibold capitalize">{file?.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-black/30">Không gian (Mode)</p>
                    <div className="flex items-center gap-2 text-black/60">
                       <Database className="w-3.5 h-3.5" />
                       <span className="text-[13px] font-mono">{file?.mode}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-black/30">ID tài liệu</p>
                    <p className="text-[12px] font-mono text-black/40 break-all">{file?.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
