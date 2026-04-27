import { createServerSupabase } from '@/core/lib/supabase-server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';
import { DrizzleAuthRepositoryAdapter } from '@core/infrastructure/adapters';

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

  const authRepo = new DrizzleAuthRepositoryAdapter();
  const internalUserId = await authRepo.getInternalId(user.id);
  
  if (!internalUserId) {
     redirect('/');
  }

  const dbUser = await authRepo.getUser(internalUserId);
  if (dbUser?.role !== 'admin') {
    redirect('/');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
