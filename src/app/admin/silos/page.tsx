'use client';

import { useCallback } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { useRouter } from 'next/navigation';
import { SilosContent, SilosHeader, SilosModal } from './silos-sections';
import { useSilos } from './use-silos';

export default function SilosPage() {
  const router = useRouter();
  const {
    collections,
    files,
    loading,
    showColModal,
    newColName,
    newColQName,
    newColDesc,
    setShowColModal,
    setNewColName,
    setNewColQName,
    setNewColDesc,
    fetchData,
    handleCreateCollection,
    handleDeleteCollection,
  } = useSilos();

  const handleSelectSilo = useCallback(
    (siloId: string) => {
      router.push(`/admin/silos/${siloId}`);
    },
    [router]
  );

  return (
    <>
      <AdminHeader 
        view="silos" 
        onViewChange={(v) => v === 'files' ? null : {}} 
        onSidebarOpen={() => {}} // Controlled by layout
        onSync={fetchData} loading={loading}
        onLogout={() => { localStorage.removeItem('vmg_admin_auth'); window.location.reload(); }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <div className="space-y-10 animate-in fade-in duration-500">
            <SilosHeader onCreate={() => setShowColModal(true)} />
            <SilosContent
              collections={collections}
              files={files}
              onSelectSilo={handleSelectSilo}
              onDelete={handleDeleteCollection}
            />
          </div>
        </div>
      </div>
      <SilosModal
        show={showColModal}
        name={newColName}
        qName={newColQName}
        desc={newColDesc}
        onNameChange={setNewColName}
        onQNameChange={setNewColQName}
        onDescChange={setNewColDesc}
        onSubmit={handleCreateCollection}
        onClose={() => setShowColModal(false)}
      />
    </>
  );
}
