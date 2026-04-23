'use client';

import React, { useState, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-black/90">
      <Suspense fallback={<div className="w-[240px] h-full bg-[#f6f5f4] animate-pulse" />}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </Suspense>
      
      <main className="flex-1 flex flex-col min-w-0 md:ml-[240px] relative h-full min-h-0">
        <Suspense fallback={<div className="flex-1 bg-white animate-pulse" />}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child) && typeof child.type !== 'string') {
              return React.cloneElement(child as React.ReactElement<any>, { 
                onToggleSidebar: () => setIsSidebarOpen(prev => !prev) 
              });
            }
            return child;
          })}
        </Suspense>
      </main>
    </div>
  );
}
