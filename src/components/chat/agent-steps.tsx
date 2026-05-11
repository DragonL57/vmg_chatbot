'use client';

import React from 'react';
import { Loader2, FileText, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface AgentStepsProps {
  phase: string;
  reflections?: ReadonlyArray<string>;
}

type TraceLine = { text: string; indent: number; isFile: boolean };

function parseTrace(reflections: string[]): TraceLine[] {
  return reflections
    .flatMap(r => r.split('\n').filter(Boolean))
    .map(line => {
      const cleaned = line.trim();
      if (!cleaned) return null;
      const indent = line.length - line.trimStart().length;
      const isFile = cleaned.endsWith('.md') || cleaned.endsWith('.pdf');
      return { text: cleaned, indent: Math.min(indent / 2, 3), isFile };
    })
    .filter((l): l is TraceLine => l !== null);
}

export const AgentSteps: React.FC<AgentStepsProps> = ({ phase, reflections = [] }) => {
  const isComplete = phase === 'complete' || phase === 'generate';
  const [collapsed, setCollapsed] = React.useState(true);
  const trace = parseTrace(reflections as string[]);

  // Expand when reasoning, collapse when complete — but let user toggle freely
  const prevPhase = React.useRef(phase);
  React.useEffect(() => {
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      setCollapsed(isComplete);
    }
  }, [phase, isComplete]);

  return (
    <div className="mb-4 w-full bg-white border border-black/[0.06] rounded-[10px] overflow-hidden shadow-sm">
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.01] w-full text-left group">
        <div className="flex items-center gap-2.5">
          {!isComplete && <Loader2 className="w-3.5 h-3.5 text-[#D32F2F] animate-spin" strokeWidth={3} />}
          {isComplete && <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />}
          <span className="text-[13px] font-bold text-black/50">
            {isComplete ? 'Tiến trình suy luận' : 'MATE đang suy nghĩ...'}
          </span>
        </div>
        <div className="flex-grow" />
        <div className="p-1 text-black/20 group-hover:text-black/40">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      <div className={`grid transition-all duration-300 ${collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3 border-t border-black/[0.03] pt-3">
            <div className="space-y-1">
              {trace.map((line, i) => (
                <p key={i}
                  className={`text-[12px] leading-relaxed ${
                    line.isFile
                      ? 'text-black/60 font-semibold flex items-center gap-1.5'
                      : 'text-black/35'
                  }`}
                  style={{ paddingLeft: `${line.indent * 12}px` }}
                >
                  {line.isFile && <FileText className="w-3 h-3 text-black/25 shrink-0" />}
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
