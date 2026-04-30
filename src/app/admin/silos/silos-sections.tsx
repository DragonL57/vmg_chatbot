'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { SiloTable } from '@/components/admin/silo-table';
import { CreateSiloModal } from '@/components/admin/create-silo-modal';
import { type KnowledgeFile, type KnowledgeCollection } from '@core/application/ports/knowledge-repository.port';

export const SilosHeader = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-[32px] font-bold tracking-tight mb-1.5">Quản lý kho tri thức</h1>
      <p className="text-[16px] text-[#615d59]">Tổ chức và quản lý các không gian dữ liệu riêng biệt cho AI.</p>
    </div>
    <button onClick={onCreate} className="notion-btn-primary flex items-center gap-2">
      <Plus className="w-4 h-4" /> Tạo không gian
    </button>
  </div>
);

type SilosContentProps = {
  collections: KnowledgeCollection[];
  files: KnowledgeFile[];
  onSelectSilo: (siloId: string) => void;
  onDelete: (id: string) => void;
};

export const SilosContent = ({
  collections,
  files,
  onSelectSilo,
  onDelete,
}: SilosContentProps) => (
  <SiloTable
    collections={collections}
    files={files}
    onSelectSilo={collection => onSelectSilo(collection.id)}
    onDelete={onDelete}
  />
);

type SilosModalProps = {
  show: boolean;
  name: string;
  qName: string;
  desc: string;
  onNameChange: (value: string) => void;
  onQNameChange: (value: string) => void;
  onDescChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const SilosModal = ({
  show,
  name,
  qName,
  desc,
  onNameChange,
  onQNameChange,
  onDescChange,
  onSubmit,
  onClose,
}: SilosModalProps) => {
  if (!show) return null;
  return (
    <CreateSiloModal
      name={name}
      onNameChange={onNameChange}
      qName={qName}
      onQNameChange={onQNameChange}
      desc={desc}
      onDescChange={onDescChange}
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
      onClose={onClose}
    />
  );
};
