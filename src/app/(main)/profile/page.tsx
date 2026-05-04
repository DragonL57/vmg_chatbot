'use client';

import React from 'react';
import { LoadingView, MemorySection, ProfileHeader } from './profile-sections';
import { DataPrivacySection } from './data-privacy-section';
import { useMemoryEditor, useProfileData } from './use-profile';

export default function ProfilePage() {
  const { user, memories, isLoading, setMemories } = useProfileData();
  const {
    editingId,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    handleDeleteMemory,
    handleUpdateMemory,
  } = useMemoryEditor(setMemories);

  if (isLoading) return <LoadingView />;

  return (
    <div className="flex-1 bg-[#f6f5f4] overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <ProfileHeader user={user} />
        <DataPrivacySection />
        <MemorySection
          memories={memories}
          editingId={editingId}
          editValue={editValue}
          onEditValueChange={setEditValue}
          onStartEdit={startEdit}
          onSaveEdit={handleUpdateMemory}
          onCancelEdit={cancelEdit}
          onDelete={handleDeleteMemory}
        />
      </div>
    </div>
  );
}

