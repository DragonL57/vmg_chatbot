'use client';

import { use } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { useRouter } from 'next/navigation';
import { FileDetailForm, FileDetailHeader, FileDetailInfo, LoadingView } from './file-detail-sections';
import { useFileDetail } from './use-file-detail';

interface FileDetailPageProps {
  params: Promise<{ id: string; fileId: string }>;
}

export default function FileDetailPage({ params }: FileDetailPageProps) {
  const router = useRouter();
  const { id: siloId, fileId } = use(params);
  const {
    file,
    silo,
    loading,
    saving,
    filename,
    summary,
    setFilename,
    setSummary,
    refresh,
    handleSave,
    handleDelete,
    handleRegenerateSummary,
  } = useFileDetail(siloId, fileId);

  if (loading) return <LoadingView />;

  return (
    <>
      <AdminHeader 
        view="files" activeSiloName={silo?.name} 
        onViewChange={() => router.push('/admin/silos')}
        onSidebarOpen={() => {}}
        onSync={refresh} loading={loading}
        onLogout={() => { localStorage.removeItem('vmg_admin_auth'); window.location.reload(); }}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Breadcrumb & Title */}
          <FileDetailHeader
            siloName={silo?.name}
            onBack={() => router.push(`/admin/silos/${siloId}`)}
            onDelete={handleDelete}
            onSave={handleSave}
            saving={saving}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form Fields */}
            <FileDetailForm
              filename={filename}
              summary={summary}
              onFilenameChange={setFilename}
              onSummaryChange={setSummary}
              onRegenerateSummary={handleRegenerateSummary}
            />

            {/* Side Info */}
            <FileDetailInfo file={file} />
          </div>
        </div>
      </div>
    </>
  );
}
