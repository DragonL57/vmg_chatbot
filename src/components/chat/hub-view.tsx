import React from 'react';
import { SiloGrid } from './silo-grid';
import { HubSkeleton } from './hub-skeleton';
import { type KnowledgeCollection } from '@core/application/ports/knowledge-repository.port';

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
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-12">
      <SiloGrid 
        collections={collections} 
        currentMode={currentMode} 
        onCollectionSelect={onCollectionSelect} 
      />
    </div>
  );
};
