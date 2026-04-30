import React from 'react';

export const HubSkeleton: React.FC = () => {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-12 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-black/5 rounded-xl border border-black/[0.04]" />
        ))}
      </div>
    </div>
  );
};
