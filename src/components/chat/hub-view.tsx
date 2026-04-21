import React from 'react';
import { HubHeader } from './hub-header';
import { SiloGrid } from './silo-grid';
import { HubSkeleton } from './hub-skeleton';
import { type KnowledgeCollection } from '@core/services/supabase.service';

interface HubViewProps {
  collections: KnowledgeCollection[];
  currentMode: string;
  onCollectionSelect: (mode: string) => void;
  isLoading?: boolean;
}

/**
 * Orchestrates the "Empty State" dashboard view.
 */
export const HubView: React.FC<HubViewProps> = ({
  collections,
  currentMode,
  onCollectionSelect,
  isLoading
}) => {
  if (isLoading) {
    return <HubSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-12">
      <HubHeader />
      <SiloGrid 
        collections={collections} 
        currentMode={currentMode} 
        onCollectionSelect={onCollectionSelect} 
      />
    </div>
  );
};
