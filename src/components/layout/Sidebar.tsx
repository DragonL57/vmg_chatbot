'use client';

import React from 'react';
import { ServiceMode } from '@/types/chat';
import { X, GraduationCap, Plane, MessageSquareText, BookOpen } from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ServiceMode;
  onModeChange: (mode: ServiceMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentMode,
  onModeChange,
}) => {
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
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-slate-100 h-10 w-10 flex items-center justify-center shadow-sm">
              <Image src="/apple-icon.svg" alt="VMG Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-none">VMG Portal</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-tight">Smart Solutions</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600"
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
              <button
                onClick={() => {
                  onModeChange('wiki');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  currentMode === 'wiki'
                    ? 'bg-[#D32F2F]/5 text-[#D32F2F] shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BookOpen className={`w-5 h-5 ${currentMode === 'wiki' ? 'text-[#D32F2F]' : 'text-slate-400'}`} />
                <span>Wiki</span>
                {currentMode === 'wiki' && (
                  <div className="ml-auto w-1.5 h-1.5 bg-[#D32F2F] rounded-full shadow-[0_0_8px_rgba(211,47,47,0.5)]"></div>
                )}
              </button>
            </nav>
          </div>

          <div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Dịch vụ tư vấn
            </p>
            <nav className="space-y-1 opacity-40 pointer-events-none">
              <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-400">
                <GraduationCap className="w-5 h-5 text-slate-300" />
                <span>VMG English (ESL)</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">Soon</span>
              </div>
              <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-400">
                <Plane className="w-5 h-5 text-slate-300" />
                <span>VMG Global Pathway</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">Soon</span>
              </div>
            </nav>
          </div>

          <div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Hỗ trợ
            </p>
            <nav className="space-y-1 opacity-40 pointer-events-none">
              <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400">
                <MessageSquareText className="w-4 h-4 text-slate-300" />
                <span>Hướng dẫn sử dụng</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">Soon</span>
              </div>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};
