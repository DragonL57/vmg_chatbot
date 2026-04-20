'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search,
  Database,
  RefreshCw,
  Plus,
  FileBox,
  Menu,
  Lock,
  Terminal,
  ChevronRight,
  Folder,
  FolderPlus,
  Edit2,
  ChevronLeft,
  LayoutGrid,
  HardDrive,
  ArrowLeft,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/services/supabase.service';
import { Sidebar } from '@/components/layout/Sidebar';
import { slugify } from '@/core/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

// Helper to colorize terminal logs
function TerminalLog({ text }: { text: string }) {
  const isInitializing = text.includes('INITIALIZING:');
  const isChunking = text.includes('CHUNKING:');
  const isProcessing = text.includes('PROCESSING:');
  const isCompleted = text.includes('COMPLETED:');
  const isUploading = text.includes('UPLOADING:') || text.includes('SYNCED:');
  const isSuccess = text.includes('SUCCESS:');
  const isError = text.includes('ERROR:');

  let color = 'text-slate-300';
  if (isInitializing) color = 'text-blue-400 font-bold';
  if (isChunking) color = 'text-amber-400';
  if (isProcessing) color = 'text-slate-400 opacity-80';
  if (isCompleted) color = 'text-emerald-400';
  if (isUploading) color = 'text-indigo-400';
  if (isSuccess) color = 'text-emerald-500 font-extrabold';
  if (isError) color = 'text-rose-500 font-bold';

  return (
    <p className={`${color} flex items-start gap-2 leading-relaxed tracking-tight`}>
      <ChevronRight className={`w-3 h-3 mt-1 shrink-0 ${isSuccess ? 'text-emerald-500' : 'text-slate-600'}`} />
      <span>{text}</span>
    </p>
  );
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<'silos' | 'files'>('silos');
  const [activeSilo, setActiveSilo] = useState<KnowledgeCollection | null>(null);
  const [currentFolder, setCurrentFolder] = useState('root');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditingName] = useState('');
  const [editType, setEditType] = useState<'collection' | 'file' | null>(null);

  // Initialize Supabase client with TRUNCATION detection
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_KEY;
    if (!url || !key || url === 'undefined' || key === 'undefined' || key.length < 40) return null;
    try {
      return createClient(url, key, { auth: { persistSession: false } });
    } catch (e) {
      console.error('[Supabase Init Error]', e);
      return null;
    }
  }, []);

  const [showColModal, setShowColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColQName, setNewColQName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = localStorage.getItem('vmg_admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
      fetchCollections();
      startPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [files]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const res = await fetch('/api/admin/files');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
        const stillIndexing = data.some(f => f.status === 'indexing');
        if (!stillIndexing) stopPolling();
      }
    }, 1500);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function fetchCollections() {
    try {
      const res = await fetch('/api/admin/collections');
      const data = await res.json();
      if (Array.isArray(data)) setCollections(data);
    } catch (err) { console.error('Failed to fetch collections'); }
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
        fetchCollections();
      }
    } catch (err) { alert('Failed to create collection'); }
  }

  async function handleRename(id: string, type: 'collection' | 'file') {
    if (!editName) return;
    const url = type === 'collection' ? `/api/admin/collections/${id}` : `/api/admin/files/${id}`;
    const field = type === 'collection' ? 'name' : 'filename';
    
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: editName }),
      });
      if (res.ok) {
        setEditingId(null);
        if (type === 'collection') fetchCollections();
        else fetchFiles();
      }
    } catch (err) { alert('Lỗi khi đổi tên'); }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === 'ilovevmg') {
      setIsAuthenticated(true);
      localStorage.setItem('vmg_admin_auth', 'true');
    } else { alert('Sai mật khẩu!'); }
  }

  async function fetchFiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/files');
      const data = await res.json();
      if (Array.isArray(data)) setFiles(data);
    } catch (error) { console.error('Failed to fetch files:', error); }
    finally { setLoading(false); }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !activeSilo || !supabase) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${slugify(selectedFile.name.split('.')[0])}.${fileExt}`;
      const filePath = `sources/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('knowledge-sources')
        .upload(filePath, selectedFile);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const res = await fetch('/api/admin/ingest', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          storagePath: filePath,
          mode: activeSilo.qdrantName,
          folder: currentFolder
        })
      });

      if (res.status === 202) {
        setSelectedFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchFiles();
        startPolling();
      } else {
        const err = await res.json();
        alert(`Ingestion failed: ${err.error}`);
      }
    } catch (error: any) { 
      console.error('Upload process error:', error);
      alert(error.message || 'Lỗi trong quá trình tải lên'); 
    } finally { 
      setUploading(false); 
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      const res = await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
      if (res.ok) fetchFiles();
    } catch (error) { console.error('Delete error:', error); }
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm('Xóa toàn bộ không gian kiến thức này?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchCollections(); setView('silos'); setActiveSilo(null); }
    } catch (error) { console.error('Delete collection error:', error); }
  }

  async function handleGenerateSummary(id: string) {
    try {
      const res = await fetch(`/api/admin/files/generate-summary`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Đã tạo tóm tắt mới: ${data.summary.slice(0, 100)}...`);
        fetchFiles();
        fetchCollections(); // Refresh collection description too
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.error}`);
      }
    } catch (error) {
      console.error('Manual summary error:', error);
      alert('Lỗi khi tạo tóm tắt');
    }
  }

  // Filtered lists
  const siloFiles = useMemo(() => {
    if (!activeSilo) return [];
    return files.filter(f => f.mode === activeSilo.qdrantName);
  }, [files, activeSilo]);

  const uniqueFolders = useMemo(() => {
    const folders = new Set<string>();
    siloFiles.forEach(f => { if (f.folder && f.folder !== 'root') folders.add(f.folder); });
    return Array.from(folders);
  }, [siloFiles]);

  const filteredFiles = useMemo(() => {
    let result = siloFiles.filter(f => (f.folder || 'root') === currentFolder);
    if (searchQuery) {
      result = siloFiles.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [siloFiles, searchQuery, currentFolder]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-black">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#D32F2F] rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-red-100"><Lock className="w-8 h-8" /></div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
            <p className="text-slate-500 text-sm">Vui lòng nhập mật khẩu để quản trị hệ thống</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all text-black" autoFocus />
            <button type="submit" className="w-full py-3.5 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100">Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  const keyLen = env.NEXT_PUBLIC_SUPABASE_KEY?.length || 0;
  const isKeyBroken = keyLen > 0 && keyLen < 40;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar relative md:ml-72">
        <div className="max-w-6xl mx-auto p-6 md:p-10 pb-24 text-black">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 border-b border-slate-200 pb-8 text-black">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-opacity md:hidden"><Menu className="w-6 h-6" /></button>
              <div>
                <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                   <button onClick={() => setView('silos')} className="hover:text-[#D32F2F] transition-colors">Knowledge Silos</button>
                   {view === 'files' && (
                     <>
                       <ChevronRight className="w-3 h-3" />
                       <span className="text-[#D32F2F]">{activeSilo?.name}</span>
                     </>
                   )}
                </nav>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-[#D32F2F] rounded-lg shadow-lg shadow-red-200 text-white hidden sm:flex">
                    {view === 'silos' ? <LayoutGrid className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
                  </div>
                  {view === 'silos' ? 'Knowledge Silos' : activeSilo?.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchFiles} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#D32F2F] transition-all shadow-sm active:scale-95 text-black">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync
              </button>
              <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem('vmg_admin_auth'); }} className="px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 rounded-lg transition-all">Đăng xuất</button>
            </div>
          </header>

          {(!supabase || isKeyBroken) && (
            <div className="mb-10 p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 text-black">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-rose-900">Cấu hình Supabase không hợp lệ</h4>
                {isKeyBroken ? (
                  <p className="text-sm text-rose-700 mt-1">Supabase Key hiện tại quá ngắn (<b>{keyLen} ký tự</b>). Vui lòng dán lại <b>FULL KEY</b> vào Vercel.</p>
                ) : (
                  <p className="text-sm text-rose-700 mt-1">Hệ thống không tìm thấy cấu hình kết nối. Vui lòng kiểm tra lại Dashboard Vercel.</p>
                )}
              </div>
            </div>
          )}

          {/* VIEW SWITCHER */}
          {view === 'silos' ? (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {collections.map(col => (
                    <div key={col.id} onClick={() => { setActiveSilo(col); setView('files'); }} className="group relative bg-white rounded-3xl border-2 border-slate-100 p-8 transition-all hover:border-[#D32F2F] hover:shadow-2xl hover:shadow-red-900/5 cursor-pointer">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-[#D32F2F] group-hover:text-white rounded-2xl transition-all">
                          <Database className="w-8 h-8" />
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditingId(col.id); setEditingName(col.name); setEditType('collection'); }} className="p-2 text-slate-300 hover:text-blue-500 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCollection(col.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      {editingId === col.id && editType === 'collection' ? (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <input value={editName} onChange={(e) => setEditingName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-red-500/20 outline-none" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRename(col.id, 'collection')} />
                          <div className="flex gap-2">
                            <button onClick={() => handleRename(col.id, 'collection')} className="px-4 py-1.5 bg-[#D32F2F] text-white text-[10px] font-bold rounded-lg">Lưu</button>
                            <button onClick={() => setEditingId(null)} className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#D32F2F] transition-colors">{col.name}</h3>
                          <p className="text-sm text-slate-500 mt-3 line-clamp-3 min-h-[4.5rem] leading-relaxed font-medium">{col.description || 'Không có mô tả cho silo này.'}</p>
                        </>
                      )}
                      
                      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-black">
                        <div className="flex items-center gap-2">
                          <FileBox className="w-4 h-4 text-slate-300" />
                          <span className="text-xs font-bold text-slate-400">{files.filter(f => f.mode === col.qdrantName).length} Files</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#D32F2F] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest">Enter Silo</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowColModal(true)} className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-slate-400 hover:border-[#D32F2F] hover:text-[#D32F2F] hover:bg-white transition-all group">
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 mb-4 group-hover:scale-110 transition-all shadow-sm"><Plus className="w-8 h-8" /></div>
                    <span className="font-bold">Create New Silo</span>
                  </button>
               </div>
            </section>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* UPLOAD PANEL */}
                  <div className="lg:col-span-4 space-y-8">
                    <button onClick={() => setView('silos')} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#D32F2F] transition-colors group">
                       <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Quay lại danh sách
                    </button>
                    
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><UploadCloud className="w-6 h-6 text-[#D32F2F]" /> Index Knowledge</h2>
                      <form onSubmit={handleUpload} className="space-y-6">
                        <div className={`relative group border-2 border-dashed rounded-2xl p-10 transition-all text-center ${selectedFile ? 'border-[#D32F2F] bg-red-50/30' : 'border-slate-100 hover:border-red-400 bg-slate-50/50'}`}>
                          <input id="file-upload" type="file" accept=".md,.txt,.pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-black" disabled={uploading || files.some(f => f.status === 'indexing')} />
                          <div className="flex flex-col items-center gap-4">
                            {selectedFile ? (
                              <><div className="w-16 h-16 bg-[#D32F2F] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-200"><FileText className="w-8 h-8" /></div><div className="text-sm font-bold text-slate-700 truncate max-w-full px-4">{selectedFile.name}</div><button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs font-bold text-rose-500 hover:text-rose-600">Remove File</button></>
                            ) : (
                              <><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm group-hover:text-[#D32F2F] transition-all"><Plus className="w-8 h-8" /></div><div className="space-y-1"><p className="text-sm font-bold text-slate-700">Drop PDF, TXT or Markdown</p><p className="text-xs text-slate-400 font-medium italic">Supports up to 50MB</p></div></>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Target Folder</label>
                          <div className="flex gap-2">
                            <select value={currentFolder} onChange={(e) => setCurrentFolder(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500/10 text-black">
                              <option value="root">Root /</option>
                              {uniqueFolders.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <button type="button" onClick={() => { const name = prompt('Folder name?'); if(name) setCurrentFolder(name); }} className="p-3 bg-slate-100 rounded-xl text-slate-400 hover:bg-[#D32F2F] hover:text-white transition-all"><FolderPlus className="w-5 h-5" /></button>
                          </div>
                        </div>

                        <button type="submit" disabled={!selectedFile || uploading || files.some(f => f.status === 'indexing') || !supabase} className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${!selectedFile || uploading || files.some(f => f.status === 'indexing') || !supabase ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#D32F2F] text-white hover:bg-red-700 active:scale-[0.98] shadow-lg shadow-red-200'}`}>
                          {uploading ? <><Loader2 className="w-6 h-6 animate-spin" /> Uploading...</> : <><UploadCloud className="w-6 h-6" /> Start Ingestion</>}
                        </button>
                      </form>
                    </div>

                    {/* PER-SILO STATS */}
                    <div className="bg-[#0f172a] p-8 rounded-3xl text-white shadow-2xl">
                       <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><Database className="w-5 h-5" /></div>
                         <h4 className="font-bold">Silo Stats</h4>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Total Nodes</span><span className="font-mono font-bold text-blue-400">{siloFiles.length}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Indexed</span><span className="font-mono font-bold text-emerald-400">{siloFiles.filter(f => f.status === 'completed').length}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Storage Location</span><span className="font-mono font-bold text-slate-500 uppercase text-[10px]">{activeSilo?.qdrantName}</span></div>
                       </div>
                    </div>
                  </div>

                  {/* FILES TABLE */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-3">
                           <div className="flex bg-slate-100 p-1 rounded-xl">
                             <button onClick={() => setCurrentFolder('root')} className={`p-2 rounded-lg transition-all ${currentFolder === 'root' ? 'bg-white shadow-sm text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'}`}>
                               <HardDrive className="w-5 h-5" />
                             </button>
                           </div>
                           <div className="h-6 w-px bg-slate-200 mx-2" />
                           <div className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                              {currentFolder === 'root' ? 'ROOT' : currentFolder}
                           </div>
                         </div>
                         <div className="relative flex-1 max-w-xs">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input type="text" placeholder="Search in this silo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-red-500/5 text-sm font-bold text-black" />
                         </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
                              <th className="px-8 py-5">Knowledge Asset</th>
                              <th className="px-8 py-5 text-center">Status</th>
                              <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {/* FOLDERS */}
                            {currentFolder === 'root' && uniqueFolders.map(folder => (
                              <tr key={folder} onClick={() => setCurrentFolder(folder)} className="group hover:bg-slate-50/80 cursor-pointer transition-colors">
                                <td className="px-8 py-5 flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500 border border-amber-100 group-hover:scale-105 transition-all">
                                    <Folder className="w-6 h-6 fill-current" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900">{folder}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Folder • {files.filter(f => f.folder === folder).length} Items</p>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">—</td>
                                <td className="px-8 py-5 text-right"><ChevronRight className="w-5 h-5 ml-auto text-slate-200 group-hover:text-[#D32F2F] transition-colors" /></td>
                              </tr>
                            ))}

                            {/* BACK BUTTON IF IN FOLDER */}
                            {currentFolder !== 'root' && !searchQuery && (
                              <tr onClick={() => setCurrentFolder('root')} className="hover:bg-slate-50/80 cursor-pointer transition-colors italic">
                                <td colSpan={3} className="px-8 py-4 text-xs font-bold text-slate-400 flex items-center gap-2">
                                  <ChevronLeft className="w-4 h-4" /> Quay lại Root /
                                </td>
                              </tr>
                            )}

                            {/* FILES */}
                            {filteredFiles.map((file) => (
                              <tr key={file.id} className="group hover:bg-slate-50/80 transition-colors">
                                <td className="px-8 py-5">
                                  <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border mt-1 shrink-0 ${file.filename.endsWith('.pdf') ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-red-50 text-[#D32F2F] border-red-100'} group-hover:scale-105 transition-all`}>
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {editingId === file.id && editType === 'file' ? (
                                        <input value={editName} onChange={(e) => setEditingName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-black outline-none focus:ring-2 focus:ring-red-500/20" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRename(file.id, 'file')} />
                                      ) : (
                                        <>
                                          <p className="text-sm font-black text-slate-900 truncate">{file.filename}</p>
                                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium italic">
                                            {file.summary || 'Đang chờ tạo tóm tắt...'}
                                          </p>
                                        </>
                                      )}
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">{file.status === 'completed' ? 'Indexed' : 'Processing'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${file.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : file.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-red-50 text-red-600 animate-pulse border border-red-100'}`}>{file.status}</span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    {file.status === 'completed' && (
                                      <button onClick={() => handleGenerateSummary(file.id)} title="Tạo tóm tắt mới" className="p-2.5 bg-amber-50 text-amber-500 rounded-xl hover:bg-amber-100 transition-colors">
                                        <Sparkles className="w-4 h-4" />
                                      </button>
                                    )}
                                    {editingId === file.id && editType === 'file' ? (
                                      <button onClick={() => handleRename(file.id, 'file')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                                    ) : (
                                      <button onClick={() => { setEditingId(file.id); setEditingName(file.filename); setEditType('file'); }} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    )}
                                    <button onClick={() => handleDelete(file.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredFiles.length === 0 && currentFolder !== 'root' && (
                              <tr><td colSpan={3} className="py-24 text-center text-slate-300 font-bold italic text-sm">Thư mục này trống</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
          
          {/* BACKGROUND PROCESS TERMINAL (ALWAYS AT BOTTOM IF ACTIVE) */}
          {files.some(f => f.status === 'indexing') && view === 'files' && (
             <div className="mt-12 text-black">
                {/* Same terminal component as before, but maybe smaller? */}
             </div>
          )}
        </div>
      </main>

      {showColModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-md w-full p-10 overflow-hidden relative animate-in fade-in zoom-in duration-200 text-black">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Create New Silo</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Tạo một không gian kiến thức độc lập</p>
            <form onSubmit={handleCreateCollection} className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Display Name</label><input type="text" required placeholder="e.g. Chương trình du học" value={newColName} onChange={(e) => setNewColName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/5 focus:border-[#D32F2F] transition-all text-black" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unique Identifier</label><input type="text" placeholder="vmg_docs_edu" value={newColQName} onChange={(e) => setNewColQName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/5 focus:border-[#D32F2F] transition-all text-black" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label><textarea placeholder="Mô tả nội dung của silo này..." value={newColDesc} onChange={(e) => setNewColDesc(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/5 focus:border-[#D32F2F] transition-all resize-none text-black" /></div>
              <div className="flex items-center gap-4 mt-10">
                <button type="button" onClick={() => setShowColModal(false)} className="flex-1 py-4 text-sm font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Hủy bỏ</button>
                <button type="submit" className="flex-1 py-4 bg-[#D32F2F] text-white rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-900/20 transition-all active:scale-[0.98]">Tạo Silo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
