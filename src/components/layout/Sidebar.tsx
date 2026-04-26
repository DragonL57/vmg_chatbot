'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, MessageSquareText, Settings, Shield, ChevronRight, LogOut, MessageSquare, MoreVertical, Star, Edit2, Trash2, Check, UserCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/core/lib/supabase';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { Tooltip } from '../ui/tooltip';
import { v4 as uuidv4 } from 'uuid';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatHistory {
  id: string;
  title: string;
  isStarred: number;
  updatedAt: string;
}

const ChatContextMenu: React.FC<{
  chat: ChatHistory;
  anchorRect: DOMRect;
  onClose: () => void;
  onStar: (id: string, starred: boolean) => void;
  onRename: (chat: ChatHistory) => void;
  onDelete: (id: string) => void;
}> = ({ chat, anchorRect, onClose, onStar, onRename, onDelete }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button 
        className="fixed inset-0 z-[9998] cursor-default w-full h-full bg-transparent border-none p-0" 
        onClick={onClose}
        aria-label="Đóng menu"
      />
      <div 
        className="fixed z-[9999] w-32 bg-white rounded-md shadow-lg border border-black/[0.08] py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ 
          top: `${anchorRect.bottom + 4}px`, 
          left: `${anchorRect.right - 128}px` 
        }}
      >
        <button 
          onClick={() => { onStar(chat.id, !!chat.isStarred); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-black/70 hover:bg-black/5 text-left border-none"
        >
          <Star className={`w-3.5 h-3.5 ${chat.isStarred ? 'text-amber-500 fill-current' : ''}`} /> 
          {chat.isStarred ? 'Bỏ dấu sao' : 'Đánh dấu sao'}
        </button>
        <button 
          onClick={() => { onRename(chat); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-black/70 hover:bg-black/5 text-left border-none"
        >
          <Edit2 className="w-3.5 h-3.5" /> Đổi tên
        </button>
        <div className="h-px bg-black/[0.05] my-1" />
        <button 
          onClick={() => { onDelete(chat.id); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 text-left border-none"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa
        </button>
      </div>
    </>,
    document.body
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  // Clean up currentSessionId logic: Path param first, then query param
  const currentSessionId = (params?.id as string) || searchParams.get('session');
  
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchHistory = useCallback((silent = false) => {
    if (!silent) setIsLoadingHistory(true);
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
      })
      .finally(() => {
        if (!silent) setIsLoadingHistory(false);
      });
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    fetchUser();

    fetchHistory();

    const handleRefresh = () => fetchHistory(true); // Silent refresh
    window.addEventListener('refresh-chat-history', handleRefresh);
    return () => window.removeEventListener('refresh-chat-history', handleRefresh);
  }, [fetchHistory]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    toast.success('Đã đăng xuất');
  };

  const handleStar = async (id: string, currentlyStarred: boolean) => {
    // Optimistic Update
    setHistory(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, isStarred: currentlyStarred ? 0 : 1 } : item
      );
      // Re-sort locally: Stars first, then by date
      return updated.sort((a, b) => {
        if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });

    try {
      const res = await fetch(`/api/conversation/${id}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !currentlyStarred }),
      });
      if (!res.ok) throw new Error();
      // Silently refresh to ensure server timestamp sync
      fetchHistory(true);
    } catch (e) { 
      toast.error('Lỗi khi đánh dấu sao'); 
      // Granular Rollback
      setHistory(prev => {
        const reverted = prev.map(item => 
          item.id === id ? { ...item, isStarred: currentlyStarred ? 1 : 0 } : item
        );
        return reverted.sort((a, b) => {
          if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa cuộc hội thoại này?')) return;
    
    const itemToDelete = history.find(h => h.id === id);
    if (!itemToDelete) return;

    // Optimistic Update
    setHistory(prev => prev.filter(item => item.id !== id));
    if (currentSessionId === id) router.push('/');

    try {
      const res = await fetch(`/api/conversation/${id}/delete`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Đã xóa cuộc hội thoại');
    } catch (e) { 
      toast.error('Lỗi khi xóa'); 
      // Granular Rollback: Re-insert the item
      setHistory(prev => {
        const restored = [...prev, itemToDelete];
        return restored.sort((a, b) => {
          if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      });
      if (currentSessionId === id) router.push(`/chat/${id}`);
    }
  };

  const startRename = (chat: ChatHistory) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setActiveMenuId(null);
  };

  const submitRename = async () => {
    const idToSave = editingId;
    const titleToSave = editTitle.trim();
    if (!idToSave || !titleToSave || isRenaming) {
      setEditingId(null);
      return;
    }

    const originalItem = history.find(h => h.id === idToSave);
    if (!originalItem) return;

    setIsRenaming(true);
    // Optimistic Update
    setHistory(prev => prev.map(item => item.id === idToSave ? { ...item, title: titleToSave } : item));
    setEditingId(null);

    try {
      const res = await fetch(`/api/conversation/${idToSave}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave }),
      });
      if (!res.ok) throw new Error();
      toast.success('Đã đổi tên');
    } catch (e) { 
      toast.error('Lỗi khi đổi tên'); 
      // Granular Rollback: Revert only the title of the specific item
      setHistory(prev => {
        const reverted = prev.map(item => item.id === idToSave ? { ...item, title: originalItem.title } : item);
        return reverted.sort((a, b) => {
          if (a.isStarred !== b.isStarred) return b.isStarred - a.isStarred;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuAnchor(rect);
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const navItems = [
    { name: 'Trò chuyện mới', href: '/', icon: MessageSquareText },
    { name: 'Hồ sơ cá nhân', href: '/profile', icon: UserCircle },
  ];

  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U';
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <button 
          className="fixed inset-0 bg-black/[0.05] backdrop-blur-[1px] z-40 md:hidden animate-in fade-in duration-300 w-full h-full cursor-default border-none p-0" 
          onClick={onClose}
          aria-label="Đóng thanh bên"
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed top-0 left-0 h-full w-[240px] bg-[#f6f5f4] z-50 transition-all duration-300 transform border-r border-black/[0.05] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Profile/Branding Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 group" onClick={() => {
            if (pathname === '/') {
              window.location.href = '/'; // Hard reload if already at root to clear state
            }
            onClose();
          }}>
            <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-all">
              <Image src="/apple-icon.svg" alt="VMG" width={32} height={32} />
            </div>
            <h2 className="text-[14px] font-bold text-black/80 truncate">MATE</h2>
          </Link>
          <button onClick={onClose} className="p-1.5 text-black/40 hover:text-black/60 md:hidden hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation - Fixed Top */}
        <div className="px-2 py-4 space-y-4 shrink-0">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href && !currentSessionId;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose()}
                  className={`flex items-center gap-2.5 px-3 h-8 rounded-[4px] text-[14px] font-medium transition-all ${
                    isActive 
                      ? 'bg-black/[0.06] text-black' 
                      : 'text-black/60 hover:bg-black/5 hover:text-black/90'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D32F2F]' : 'text-black/40'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* History Section - Scrollable Bottom */}
        <div className="flex-1 overflow-y-auto px-2 pb-10 min-h-0 custom-scrollbar">
          <div className="space-y-1 mt-2">
            <p className="px-3 text-[11px] font-bold text-black/30 mb-2 uppercase tracking-wider">Gần đây</p>
            {isLoadingHistory ? (
              <div className="px-3 py-2 space-y-2">
                <div className="h-4 bg-black/5 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-black/5 rounded animate-pulse w-1/2"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-0.5 pb-4">
                {history.map((chat) => (
                  <div key={chat.id} className="relative group/item">
                    {editingId === chat.id ? (
                      <div className="flex items-center gap-2 px-3 h-8 bg-black/[0.04] rounded-[4px]">
                        <input
                          autoFocus
                          disabled={isRenaming}
                          className="bg-transparent text-[13px] w-full outline-none disabled:opacity-50"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                        <button 
                          disabled={isRenaming}
                          onMouseDown={(e) => { e.preventDefault(); submitRename(); }}
                          className="disabled:opacity-30 p-1"
                          aria-label="Lưu tên mới"
                        >
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                             router.push(`/chat/${chat.id}`);
                             onClose();
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 h-8 rounded-[4px] text-[13px] transition-all text-left border-none ${
                            currentSessionId === chat.id ? 'bg-black/[0.06] text-black font-semibold' : 'text-black/60 hover:bg-black/5 hover:text-black/90'
                          }`}
                        >
                          {chat.isStarred ? (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-black/30 shrink-0" />
                          )}
                          <span className="truncate flex-1 pr-6">{chat.title}</span>
                        </button>
                        
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                          <Tooltip content="Thao tác">
                            <button
                              onClick={(e) => handleMenuClick(e, chat.id)}
                              aria-label="Menu thao tác"
                              className={`p-1 rounded hover:bg-black/10 transition-opacity border-none ${activeMenuId === chat.id ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
                            >
                              <MoreVertical className="w-3.5 h-3.5 text-black/40" />
                            </button>
                          </Tooltip>
                        </div>

                        {activeMenuId === chat.id && menuAnchor && (
                          <ChatContextMenu 
                            chat={chat}
                            anchorRect={menuAnchor}
                            onClose={() => setActiveMenuId(null)}
                            onStar={handleStar}
                            onRename={startRename}
                            onDelete={handleDelete}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-3 text-[12px] text-black/30 italic">Chưa có hội thoại nào</p>
            )}
          </div>
        </div>

        {/* User Workspace */}
        <div className="p-2 mt-auto border-t border-black/[0.05] space-y-1 bg-[#f6f5f4] z-10">
          <div className="flex items-center gap-1 group">
            <Link 
              href="/profile"
              onClick={() => onClose()}
              aria-label="Xem hồ sơ cá nhân"
              className={`flex-1 flex items-center gap-3 p-2 rounded-[4px] hover:bg-black/5 transition-colors ${pathname === '/profile' ? 'bg-black/[0.04]' : ''}`}
            >
              <div className="w-7 h-7 rounded-[6px] bg-[#D32F2F] flex items-center justify-center text-white text-[11px] font-bold shadow-sm overflow-hidden shrink-0">
                {userAvatar ? (
                  <Image src={userAvatar} alt={userName} width={28} height={28} className="object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-black/80 truncate">{userName}</p>
                <p className="text-[10px] text-black/40 font-medium">MATE Workspace</p>
              </div>
            </Link>
            
            <Tooltip content="Đăng xuất">
              <button 
                onClick={() => handleLogout()}
                aria-label="Đăng xuất"
                className="p-1.5 text-black/30 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 border-none"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>
    </>
  );
};
