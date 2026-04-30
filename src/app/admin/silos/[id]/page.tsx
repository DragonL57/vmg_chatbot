'use client';

import { use } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { useRouter } from 'next/navigation';
import {
  LoadingView,
  SiloFileList,
  SiloHeader,
  SiloMetadataForm,
  SiloUploadSection,
} from './silo-detail-sections';
import { useSiloDetail } from './use-silo-detail';

interface SiloDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SiloDetailPage({ params }: SiloDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const {
    activeSilo,
    filteredFiles,
    loading,
    saving,
    uploading,
    selectedFile,
    searchQuery,
    siloName,
    siloDesc,
    supabase,
    setSelectedFile,
    setSearchQuery,
    setSiloName,
    setSiloDesc,
    fetchSiloData,
    handleSaveSiloMetadata,
    handleRegenerateSiloDescription,
    handleDeleteSilo,
    handleUpload,
    handleDeleteFile,
  } = useSiloDetail(id);

  if (loading && !activeSilo) return <LoadingView />;

  return (
    <>
      <AdminHeader 
        view="files" activeSiloName={activeSilo?.name} 
        onViewChange={() => router.push('/admin/silos')}
        onSidebarOpen={() => {}}
        onSync={fetchSiloData} loading={loading}
        onLogout={() => { localStorage.removeItem('vmg_admin_auth'); window.location.reload(); }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="max-w-6xl mx-auto px-8 py-10 space-y-12">
          {/* Header Metadata Section */}
          <div className="space-y-6 animate-in fade-in duration-500">
            <SiloHeader
              onBack={() => router.push('/admin/silos')}
              onDelete={handleDeleteSilo}
              onSave={handleSaveSiloMetadata}
              saving={saving}
            />
            <SiloMetadataForm
              activeSilo={activeSilo}
              siloName={siloName}
              siloDesc={siloDesc}
              onSiloNameChange={setSiloName}
              onSiloDescChange={setSiloDesc}
              onRegenerate={handleRegenerateSiloDescription}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start border-t border-black/[0.05] pt-10">
            {/* Upload Panel */}
            <SiloUploadSection
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              onUpload={handleUpload}
              uploading={uploading}
              disabled={!supabase}
            />
            
            {/* File Management */}
            <SiloFileList
              files={filteredFiles}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onDelete={handleDeleteFile}
              siloId={id}
            />
          </div>
        </div>
      </div>
    </>
  );
}
