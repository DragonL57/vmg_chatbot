'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AdminLogin } from '@/components/admin/admin-login';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const auth = localStorage.getItem('vmg_admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === 'ilovevmg') {
      setIsAuthenticated(true);
      localStorage.setItem('vmg_admin_auth', 'true');
    } else {
      alert('Sai mật khẩu!');
    }
  }

  if (!isAuthenticated) {
    return <AdminLogin password={password} onPasswordChange={setPassword} onSubmit={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden text-black/90">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-[240px]">
        {children}
      </div>
    </div>
  );
}
