import { createServerSupabase } from '@/core/lib/supabase-server';
import { getUserRole } from '@/core/services/auth.service';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = await getUserRole(user.id);
  if (role !== 'admin') {
    redirect('/');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
