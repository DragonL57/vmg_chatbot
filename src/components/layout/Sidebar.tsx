'use client';

import React from 'react';
import { X, BookOpen, MessageSquareText, Settings, Shield, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const navItems = [
    { name: 'Trò chuyện', href: '/', icon: MessageSquareText },
    { name: 'Hướng dẫn sử dụng', href: '/guide', icon: BookOpen, disabled: true },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/[0.05] backdrop-blur-[1px] z-40 md:hidden animate-in fade-in duration-300" 
          onClick={onClose} 
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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-all">
              <Image src="/apple-icon.svg" alt="VMG" width={32} height={32} />
            </div>
            <h2 className="text-[14px] font-bold text-black/80 truncate">VMG MATE</h2>
          </Link>
          <button onClick={onClose} className="p-1.5 text-black/40 hover:text-black/60 md:hidden hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 custom-scrollbar">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.disabled ? '#' : item.href}
                  onClick={() => !item.disabled && onClose()}
                  className={`flex items-center gap-2.5 px-3 h-8 rounded-[4px] text-[14px] font-medium transition-all ${
                    isActive 
                      ? 'bg-black/[0.06] text-black' 
                      : item.disabled ? 'opacity-20 cursor-not-allowed' : 'text-black/60 hover:bg-black/5 hover:text-black/90'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D32F2F]' : 'text-black/40'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div>
             <p className="px-3 text-[11px] font-bold text-black/30 mb-2">Hệ thống</p>
             <Link
                href="/admin"
                onClick={() => onClose()}
                className={`flex items-center gap-2.5 px-3 h-8 rounded-[4px] text-[14px] font-medium transition-all ${
                  pathname.startsWith('/admin') ? 'bg-black/[0.06] text-black' : 'text-black/60 hover:bg-black/5'
                }`}
              >
                <Shield className={`w-4 h-4 ${pathname.startsWith('/admin') ? 'text-[#D32F2F]' : 'text-black/40'}`} strokeWidth={1.5} />
                <span>Bảng điều khiển</span>
              </Link>
          </div>
        </div>

        {/* User Workspace */}
        <div className="p-2 mt-auto border-t border-black/[0.05]">
          <div className="flex items-center gap-3 p-2 rounded-[4px] hover:bg-black/5 transition-colors cursor-pointer group">
            <div className="w-6 h-6 rounded-[4px] bg-[#D32F2F] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
              {isAdmin ? 'AD' : 'GU'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-black/80 truncate">VMG {isAdmin ? 'Quản trị' : 'Khách'}</p>
              <p className="text-[10px] text-black/40 font-medium">MATE Free</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </aside>
    </>
  );
};
