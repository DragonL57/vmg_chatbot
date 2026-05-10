import React from 'react';
import { HubSkeleton } from './hub-skeleton';

interface HubViewProps {
  isLoading?: boolean;
}

/**
 * Welcome state shown when no conversation is active.
 * Collections are auto-routed — no manual selection needed.
 */
export const HubView: React.FC<HubViewProps> = ({ isLoading }) => {
  if (isLoading) {
    return <HubSkeleton />;
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-12">
      <div className="space-y-6 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-black/70">
          VMG MATE
        </h2>
        <p className="text-black/50 max-w-md mx-auto leading-relaxed">
          Trợ lý thông minh cho trung tâm Anh ngữ VMG.
          Hãy đặt câu hỏi về chương trình, chính sách hoặc thủ tục nội bộ.
        </p>
      </div>
    </div>
  );
};
