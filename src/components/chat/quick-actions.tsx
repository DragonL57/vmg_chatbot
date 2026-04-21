import React from 'react';
import { Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onSuggestionClick?: (text: string) => void;
}

const SUGGESTIONS = [
  { t: "Singapore Program", d: "Destinations & Boarding" },
  { t: "E-Plus Online", d: "Levels & Curriculum" },
  { t: "Placement Process", d: "Step-by-step guide" },
  { t: "Summer 2026", d: "Commission policies" }
];

export const QuickActions: React.FC<QuickActionsProps> = ({ onSuggestionClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {SUGGESTIONS.map((item) => (
        <button
          key={item.t}
          onClick={() => onSuggestionClick?.(item.t)}
          className="notion-card group text-left p-4 hover:border-[#D32F2F]/30 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D32F2F] mb-3" />
          <h4 className="text-[14px] font-bold text-black/90">{item.t}</h4>
          <p className="text-[12px] text-black/40 mt-1 leading-snug">{item.d}</p>
        </button>
      ))}
    </div>
  );
};
