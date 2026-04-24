'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import { User, BrainCircuit, Trash2, Calendar, Mail, Shield, UserCircle, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Memory {
  id: string;
  fact: string;
  category: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditTitle] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          const res = await fetch('/api/user/memories');
          const data = await res.json();
          if (data.memories) setMemories(data.memories);
        } catch (e) {
          toast.error('Không thể tải tri thức người dùng');
        }
      }
      setIsLoading(false);
    };
    loadProfile();
  }, []);

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa tri thức này?')) return;
    try {
      const res = await fetch('/api/user/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: id }),
      });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
        toast.success('Đã xóa tri thức');
      }
    } catch (e) {
      toast.error('Lỗi khi xóa');
    }
  };

  const handleUpdateMemory = async (id: string) => {
    const newVal = editValue.trim();
    if (!newVal) return;
    
    try {
      const res = await fetch('/api/user/memories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: id, fact: newVal }),
      });
      if (res.ok) {
        setMemories(prev => prev.map(m => m.id === id ? { ...m, fact: newVal } : m));
        setEditingId(null);
        toast.success('Đã cập nhật tri thức');
      }
    } catch (e) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  if (isLoading) {
    // ... (Loading UI remains same) ...
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f6f5f4]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-black/5 rounded-full" />
          <div className="h-4 bg-black/5 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f6f5f4] overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        
        {/* User Card */}
        <div className="bg-white rounded-[16px] border border-black/[0.06] p-8 shadow-zalo-l1 flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
            {user?.user_metadata?.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="Avatar" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-black/5 flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-black/10" />
              </div>
            )}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-[24px] font-bold text-black/90">{user?.user_metadata?.full_name || 'Người dùng VMG'}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-1.5 text-[13px] text-black/40 font-medium">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-black/40 font-medium">
                <Shield className="w-3.5 h-3.5" />
                Thành viên
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-black/40 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Tham gia {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Memory Section (Admin Table Style) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-black/40" />
              <h2 className="text-[17px] font-bold text-black/80">Tri thức MATE đã ghi nhớ</h2>
            </div>
            <span className="text-[11px] font-bold text-black/20 uppercase tracking-widest">{memories.length} bản ghi</span>
          </div>

          <div className="bg-white rounded-[12px] border border-black/[0.08] overflow-hidden shadow-sm">
            {memories.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-[14px] text-black/30 font-medium italic">MATE chưa có tri thức đặc biệt nào về bạn.</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                <div className="grid grid-cols-[100px_1fr_80px] px-4 py-2.5 bg-black/[0.01] text-[11px] font-bold text-black/30 tracking-tight">
                  <span>Loại</span>
                  <span>Nội dung được ghi nhớ</span>
                  <span className="text-right">Thao tác</span>
                </div>
                {memories.map((m) => (
                  <div key={m.id} className="grid grid-cols-[100px_1fr_80px] items-center px-4 py-3 group hover:bg-black/[0.01] transition-colors min-h-[56px]">
                    <span className="text-[11px] font-bold text-black/40 tracking-tight">
                      {m.category === 'persona' ? 'cá nhân' :
                       m.category === 'preference' ? 'sở thích' :
                       m.category === 'entity' ? 'thực thể' :
                       m.category === 'episodic' ? 'sự kiện' : m.category}
                    </span>
                    
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2 pr-4">
                        <input
                          autoFocus
                          className="flex-1 bg-black/[0.03] border border-black/[0.05] rounded-md px-2 py-1 text-[14px] font-medium outline-none focus:border-[#D32F2F]/20"
                          value={editValue}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateMemory(m.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button 
                          onClick={() => handleUpdateMemory(m.id)} 
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          aria-label="Lưu thay đổi"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)} 
                          className="p-1 text-black/20 hover:bg-black/5 rounded"
                          aria-label="Hủy bỏ"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[14px] font-medium text-black/80 leading-relaxed pr-4 line-clamp-2">{m.fact}</span>
                    )}

                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId !== m.id && (
                        <>
                          <button 
                            onClick={() => { setEditingId(m.id); setEditTitle(m.fact); }}
                            className="p-1.5 text-black/10 hover:text-black/40 transition-colors"
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa tri thức"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMemory(m.id)}
                            className="p-1.5 text-black/10 hover:text-[#D32F2F] transition-colors"
                            title="Xóa"
                            aria-label="Xóa tri thức"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <p className="px-2 text-[11px] text-black/30 leading-relaxed italic">
            * Tri thức này giúp MATE cá nhân hóa câu trả lời dựa trên vai trò và sở thích của bạn. Bạn có quyền kiểm soát và xóa bất kỳ thông tin nào MATE đã ghi nhớ.
          </p>
        </div>

      </div>
    </div>
  );
}

