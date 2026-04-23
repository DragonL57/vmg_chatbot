'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu } from 'lucide-react';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white overflow-hidden text-black/90">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-[240px]">
        {/* Mobile Header for Admin */}
        <header className="h-14 border-b border-black/[0.05] flex items-center px-4 md:hidden shrink-0 bg-white">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-black/40">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-[14px] ml-2">MATE Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
