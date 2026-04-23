'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-black/90">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0 md:ml-[240px] relative h-full min-h-0">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { 
              onToggleSidebar: () => setIsSidebarOpen(!isSidebarOpen) 
            });
          }
          return child;
        })}
      </main>
    </div>
  );
}
