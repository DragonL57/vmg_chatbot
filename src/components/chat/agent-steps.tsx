import React, { useState } from 'react';
import { Compass, History, SearchCode, ShieldCheck, MessageSquare, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentStepsProps {
  phase: string;
  detail?: string;
}

/**
 * Modern AI reasoning component with progressive disclosure.
 * Follows Notion-inspired minimalist utility dashboard principles.
 */
export const AgentSteps: React.FC<AgentStepsProps> = ({ phase, detail }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    { id: 'decompose', label: 'Phân tích yêu cầu', icon: Compass },
    { id: 'summarize', label: 'Tóm tắt bối cảnh', icon: History },
    { id: 'retrieve',  label: 'Truy xuất tri thức', icon: SearchCode },
    { id: 'grade',     label: 'Kiểm định chất lượng', icon: ShieldCheck },
    { id: 'generate',  label: 'Đang soạn câu trả lời', icon: MessageSquare },
  ];
  
  const currentStep = steps.find(s => s.id === phase) || steps[0];
  const currentIdx = steps.findIndex(s => s.id === phase);

  return (
    <div className="flex flex-col items-start mb-8 animate-in fade-in duration-500">
      {/* Main Status Bar (Always Visible) */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center gap-3 px-3 py-1.5 bg-[#f6f5f4] border border-black/[0.06] rounded-full hover:bg-black/[0.04] transition-all"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse shadow-[0_0_8px_rgba(211,47,47,0.4)]"></div>
        </div>
        
        <span className="text-[13px] font-medium text-black/60 group-hover:text-black/80 transition-colors">
          {currentStep.label}
          {detail && <span className="text-black/30 font-normal ml-2">— {detail}</span>}
        </span>

        <div className="w-px h-3 bg-black/[0.08] mx-1"></div>
        
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-black/30 group-hover:text-black/60" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-black/30 group-hover:text-black/60" />
        )}
      </button>

      {/* Expanded Reasoning Chain (Progressive Disclosure) */}
      {isExpanded && (
        <div className="mt-3 ml-2 pl-6 border-l border-black/[0.06] space-y-4 py-2 animate-in slide-in-from-top-2 duration-300">
          {steps.map((step, idx) => {
            const isDone = idx < currentIdx && phase !== '';
            const isActive = step.id === phase;
            
            // We only show steps up to the current one or all if process is complex
            if (idx > currentIdx + 1) return null;

            return (
              <div key={step.id} className="flex items-start gap-4 transition-all duration-300">
                <div className="pt-0.5 relative">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1aae39]" strokeWidth={2.5} />
                  ) : isActive ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-[#D32F2F] shadow-[0_0_6px_rgba(211,47,47,0.3)]"></div>
                    </div>
                  ) : (
                    <div className="w-4 h-4 border border-black/10 rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium leading-none ${isActive ? 'text-black' : 'text-black/30'}`}>
                    {step.label}
                  </p>
                  {isActive && detail && (
                    <p className="mt-1.5 text-[12px] text-black/50 leading-relaxed max-w-sm italic">
                      {detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
