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
  ChevronRight
} from 'lucide-react';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/services/supabase.service';
import { Sidebar } from '@/components/layout/Sidebar';
import { slugify } from '@/core/lib/utils';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New Collection state
  const [showColModal, setShowColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColQName, setNewColQName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Polling state for indexing
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('vmg_admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
      fetchCollections().then(data => {
        if (data && data.length > 0 && !mode) {
          setMode(data[0].qdrantName);
        }
      });

      // Start polling if any file is indexing
      startPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated]);

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
    }, 2000);
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
      if (Array.isArray(data)) {
        setCollections(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch collections');
    }
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
        const newCol = await res.json();
        setNewColName(''); setNewColQName(''); setNewColDesc('');
        setShowColModal(false);
        await fetchCollections();
        setMode(newCol.qdrantName || newCol.qdrant_name);
      }
    } catch (err) {
      alert('Failed to create collection');
    }
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
    if (!selectedFile || !mode) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', mode);

    try {
      const res = await fetch('/api/admin/ingest', { method: 'POST', body: formData });
      if (res.status === 202) {
        setSelectedFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchFiles();
        startPolling(); // Start watching progress
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (error) { alert('Upload failed due to a network error'); }
    finally { setUploading(false); }
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
      if (res.ok) {
        await fetchCollections();
        setMode('');
      }
    } catch (error) { console.error('Delete collection error:', error); }
  }

  const filteredFiles = useMemo(() => {
    return files.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: files.length,
      indexed: files.filter(f => f.status === 'completed').length,
      failed: files.filter(f => f.status === 'failed').length,
    };
  }, [files]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-black">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-black">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#D32F2F] rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-red-100">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
            <p className="text-slate-500 text-sm">Vui lòng nhập mật khẩu để quản trị hệ thống</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all text-black" autoFocus />
            <button type="submit" className="w-full py-3.5 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-100">Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar relative md:ml-72">
        <div className="max-w-6xl mx-auto p-6 md:p-10 pb-24 text-black">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 border-b border-slate-200 pb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-opacity md:hidden"><Menu className="w-6 h-6" /></button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-[#D32F2F] rounded-lg shadow-lg shadow-red-200 text-white hidden sm:flex"><Database className="w-6 h-6" /></div>
                  Knowledge Management
                </h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Xử lý và cập nhật kho kiến thức RAG</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchFiles} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#D32F2F] transition-all shadow-sm active:scale-95">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync
              </button>
              <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem('vmg_admin_auth'); }} className="px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 rounded-lg transition-all">Đăng xuất</button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-black">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-black">
              <div className="flex items-center justify-between mb-4"><span className="p-2 bg-slate-100 rounded-lg text-slate-600"><FileBox className="w-5 h-5" /></span><span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-black">Total</span></div>
              <p className="text-2xl font-bold text-slate-900">{stats.total} Documents</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500 text-black">
              <div className="flex items-center justify-between mb-4 text-black"><span className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 className="w-5 h-5" /></span><span className="text-xs font-bold text-emerald-500 uppercase tracking-wider text-black">Active</span></div>
              <p className="text-2xl font-bold text-slate-900">{stats.indexed} Indexed</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-rose-500 text-black">
              <div className="flex items-center justify-between mb-4 text-black"><span className="p-2 bg-rose-50 rounded-lg text-rose-600"><AlertCircle className="w-5 h-5" /></span><span className="text-xs font-bold text-rose-500 uppercase tracking-wider text-black">Issues</span></div>
              <p className="text-2xl font-bold text-slate-900 text-black">{stats.failed} Failed</p>
            </div>
          </div>

          {/* BACKGROUND PROCESS TERMINAL */}
          {files.some(f => f.status === 'indexing') && (
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500 text-black">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-black">
                <div className="px-5 py-3 bg-slate-800 flex items-center justify-between text-black">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Active Ingestion Log</span>
                  </div>
                  <div className="flex gap-1.5 text-black">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  </div>
                </div>
                <div className="p-6 h-64 overflow-y-auto font-mono text-xs flex flex-col-reverse custom-scrollbar bg-slate-950 text-black">
                  <div className="space-y-1 text-black">
                    {files.filter(f => f.status === 'indexing').map(f => (
                      <div key={f.id} className="mb-6 border-l-2 border-indigo-500/30 pl-4 text-black">
                        <p className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> {f.filename} — {f.progress}%
                        </p>
                        <div className="space-y-1 opacity-80 text-black">
                          {f.logs?.map((log, i) => (
                            <p key={i} className="text-slate-300 flex items-start gap-2">
                              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-600" />
                              {log}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-black">
            <div className="lg:col-span-4 text-black">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:sticky lg:top-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-[#D32F2F]" /> Upload Source</h2>
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className={`relative group border-2 border-dashed rounded-xl p-8 transition-all text-center ${selectedFile ? 'border-[#D32F2F] bg-red-50/30' : 'border-slate-200 hover:border-red-400 bg-slate-50/50'}`}>
                    <input id="file-upload" type="file" accept=".md,.txt,.pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading || files.some(f => f.status === 'indexing')} />
                    <div className="flex flex-col items-center gap-3">
                      {selectedFile ? (
                        <><div className="w-12 h-12 bg-[#D32F2F] text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-200"><FileText className="w-6 h-6" /></div><div className="text-sm font-semibold text-slate-700 truncate max-w-full px-4">{selectedFile.name}</div><button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs font-bold text-rose-500 hover:text-rose-600">Remove</button></>
                      ) : (
                        <><div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm group-hover:text-[#D32F2F] transition-all"><Plus className="w-6 h-6" /></div><div className="space-y-1"><p className="text-sm font-bold text-slate-700">Drop file here</p><p className="text-xs text-slate-500 font-medium text-black">PDF, Markdown or Text</p></div></>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-black"><label className="text-xs font-bold uppercase tracking-wider text-slate-400">Namespace</label><button type="button" onClick={() => setShowColModal(true)} className="text-[10px] font-bold text-[#D32F2F] hover:underline">+ New</button></div>
                    <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 text-black" disabled={uploading}>
                      {collections.length === 0 ? <option value="">No collections</option> : collections.map(col => <option key={col.id} value={col.qdrantName}>{col.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={!selectedFile || uploading || !mode || files.some(f => f.status === 'indexing')} className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${!selectedFile || uploading || !mode || files.some(f => f.status === 'indexing') ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#D32F2F] text-white hover:bg-red-700 active:scale-[0.98] shadow-lg shadow-red-200'}`}>
                    {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</> : <><UploadCloud className="w-5 h-5" /> Index Knowledge</>}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8 text-black">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-black">
                <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between text-black"><h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 text-black"><Database className="w-4 h-4 text-[#D32F2F]" /> Manage Collections</h3></div>
                <div className="overflow-x-auto text-black">
                  <table className="w-full text-left border-collapse text-black">
                    <thead><tr className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 text-black"><th className="px-6 py-4">Name</th><th className="px-6 py-4">Qdrant ID</th><th className="px-6 py-4 text-right text-black">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-50 text-black">
                      {collections.length === 0 ? (<tr><td colSpan={3} className="py-10 text-center text-slate-400 text-xs italic">No collections</td></tr>) : collections.map((col) => (
                        <tr key={col.id} className="group hover:bg-slate-50/80 transition-colors text-black"><td className="px-6 py-4"><p className="text-sm font-bold text-slate-800">{col.name}</p>{col.description && <p className="text-[10px] text-slate-400 line-clamp-1">{col.description}</p>}</td><td className="px-6 py-4 text-xs font-mono text-slate-500">{col.qdrantName}</td><td className="px-6 py-4 text-right"><button onClick={() => handleDeleteCollection(col.id)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 text-black"><Trash2 className="w-4 h-4" /></button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-black">
                <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4 text-black"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Filter files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium text-black text-black" /></div></div>
                <div className="overflow-x-auto text-black">
                  <table className="w-full text-left border-collapse text-black">
                    <thead><tr className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 text-black"><th className="px-6 py-4">Document</th><th className="px-6 py-4 text-center text-black">Status</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-right text-black">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-50 text-black">
                      {filteredFiles.length === 0 ? (<tr><td colSpan={4} className="py-24 text-center text-slate-300 text-black font-semibold text-sm">No documents found</td></tr>) : filteredFiles.map((file) => (
                        <tr key={file.id} className="group hover:bg-slate-50/80 transition-colors text-black"><td className="px-6 py-4 flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${file.filename.endsWith('.pdf') ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-red-50 text-[#D32F2F] border-red-100'}`}><FileText className="w-5 h-5" /></div><div><p className="text-sm font-bold text-slate-800 line-clamp-1">{file.filename}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-black">{file.mode}</p></div></td><td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-tight ${file.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : file.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>{file.status.toUpperCase()}</span></td><td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap text-black">{file.createdAt ? new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td><td className="px-6 py-4 text-right"><button onClick={() => handleDelete(file.id)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 text-black text-black text-black text-black"><Trash2 className="w-5 h-5" /></button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showColModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-8 overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-black">Create New Collection</h3>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-400">Display Name</label><input type="text" required placeholder="e.g. Tuyển sinh 2026" value={newColName} onChange={(e) => setNewColName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] text-black" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-400 text-black">Qdrant Identifier</label><input type="text" placeholder="vmg_docs_custom" value={newColQName} onChange={(e) => setNewColQName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] text-black text-black" /></div>
              <div className="space-y-1.5 text-black text-black"><label className="text-xs font-bold uppercase tracking-wider text-slate-400 text-black">Description</label><textarea placeholder="e.g. Thông tin về các chương trình du học hè 2026" value={newColDesc} onChange={(e) => setNewColDesc(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] text-black text-black text-black" /></div>
              <div className="flex items-center gap-3 mt-8">
                <button type="button" onClick={() => setShowColModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-black">Hủy bỏ</button>
                <button type="submit" className="flex-1 py-3 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100">Tạo Collection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
