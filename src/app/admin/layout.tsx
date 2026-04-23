'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AdminLogin } from '@/components/admin/admin-login';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('vmg_admin_auth', 'true');
        toast.success('Đăng nhập thành công');
      } else {
        toast.error('Sai mật khẩu!');
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ');
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
