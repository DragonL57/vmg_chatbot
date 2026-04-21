import React from 'react';

export const HubSkeleton: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black/[0.04] rounded-[8px]"></div>
          <div className="space-y-2">
            <div className="h-5 w-32 bg-black/[0.06] rounded"></div>
            <div className="h-3 w-48 bg-black/[0.04] rounded"></div>
          </div>
        </div>
      </div>

      {/* Silo Grid Skeleton */}
      <div className="space-y-6 pt-6 border-t border-black/[0.05]">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-black/[0.04] rounded"></div>
          <div className="h-8 w-64 bg-black/[0.02] border border-black/[0.05] rounded-[6px]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="notion-card p-5 flex flex-col gap-4 border-black/[0.05]">
              <div className="w-9 h-9 rounded-[6px] bg-black/[0.03]"></div>
              <div className="space-y-2.5">
                <div className="h-4 w-3/4 bg-black/[0.06] rounded"></div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-black/[0.04] rounded"></div>
                  <div className="h-3 w-5/6 bg-black/[0.04] rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
