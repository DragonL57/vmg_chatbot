import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface AgentStepsProps {
  phase: string;
  detail?: string;
  reflections?: ReadonlyArray<string>;
  defaultCollapsed?: boolean;
}

/**
 * Collapsible Reasoning/Thought Component.
 * Inspired by assistant-ui "ReasoningPreview" pattern.
 */
export const AgentSteps: React.FC<AgentStepsProps> = ({ phase, reflections = [], detail, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const isComplete = phase === 'complete';

  return (
    <div className={`mb-4 w-full flex flex-col bg-white border border-black/[0.08] rounded-[10px] overflow-hidden transition-all duration-300 ${!isComplete ? 'animate-in fade-in' : ''}`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.01] transition-colors w-full text-left"
      >
        <div className="flex items-center gap-2.5">
          {!isComplete && (
            <Loader2 className="w-3.5 h-3.5 text-[#D32F2F] animate-spin" strokeWidth={3} />
          )}
          <span className="text-[13px] font-bold text-black/50">
            {isComplete ? 'Tiến trình suy luận' : 'MATE đang suy nghĩ...'}
          </span>
        </div>
        
        <div className="flex-grow" />
        
        <div className="p-1 text-black/20 group-hover:text-black/40">
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3 space-y-2 border-t border-black/[0.03] pt-3">
            {reflections.length > 0 ? (
              <ul className="space-y-2">
                {reflections.map((reflection, idx) => (
                  <li key={idx} className="flex gap-2 text-[14px] font-medium text-black/60 italic leading-relaxed">
                    <span className="shrink-0 mt-2 w-1 h-1 rounded-full bg-black/10" />
                    <span>{reflection}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] font-medium text-black/60 italic leading-relaxed animate-pulse">
                Đang khởi tạo chuỗi suy luận...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

