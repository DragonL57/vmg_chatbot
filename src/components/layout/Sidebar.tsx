'use client';

import React from 'react';
import { X, MessageSquareText, BookOpen, Database, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Wiki Chat',
      href: '/',
      icon: BookOpen,
      color: '#D32F2F',
    }
  ];

  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transition-transform duration-300 transform shadow-2xl border-r border-slate-100 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-slate-100 h-10 w-10 flex items-center justify-center shadow-sm">
              <Image src="/apple-icon.svg" alt="VMG Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-none">VMG Portal</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-tight">Smart Solutions</p>
            </div>
          </Link>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Công cụ nội bộ
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onClose()}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive 
                        ? `bg-red-50 text-[#D32F2F] shadow-sm` 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#D32F2F]' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-[#D32F2F] rounded-full shadow-[0_0_8px_rgba(211,47,47,0.5)]"></div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Hỗ trợ
            </p>
            <nav className="space-y-1 text-black">
              <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 opacity-40">
                <MessageSquareText className="w-4 h-4 text-slate-300" />
                <span>Hướng dẫn sử dụng</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">Soon</span>
              </div>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              isAdmin ? 'bg-red-100 text-[#D32F2F]' : 'bg-slate-200 text-slate-500'
            }`}>
              {isAdmin ? 'AD' : 'G'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {isAdmin ? 'Administrator' : 'Guest'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {isAdmin ? 'System Access' : 'Read-only Access'}
              </p>
            </div>
            {isAdmin && <Settings className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </aside>
    </>
  );
};
