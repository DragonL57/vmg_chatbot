'use client';

import React from 'react';
import { Loader2, FileText, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface AgentStepsProps {
  phase: string;
  reflections?: ReadonlyArray<string>;
}

type Step = {
  id: string;
  label: string;
  detail: string | null;
  isDone: boolean;
  isActive: boolean;
};

function detectStepIdx(line: string): number {
  if (line.startsWith('History compacted') || line.startsWith('Conversation context')) return 0;
  if (line.startsWith('Query analyzed')) return 1;
  if (line.startsWith('Searched') || line.startsWith('Chọn') || line.startsWith('Đã') || line.startsWith('Lọc') || line.startsWith('Đang') || line.startsWith('PageIndex') || line.includes(': [')) return 2;
  if (line.startsWith('Synthesized')) return 3;
  return -1;
}

function parseSteps(reflections: string[], currentPhase: string): Step[] {
  const steps: Step[] = [
    { id: 'summarize', label: 'Tóm lược hội thoại', detail: null, isDone: false, isActive: false },
    { id: 'analyze_query', label: 'Phân tích câu hỏi', detail: null, isDone: false, isActive: false },
    { id: 'retrieve', label: 'Tìm kiếm tài liệu', detail: null, isDone: false, isActive: false },
    { id: 'compress', label: 'Tổng hợp câu trả lời', detail: null, isDone: false, isActive: false },
  ];

  const allLines = reflections.flatMap(r => r.split('\n').filter(Boolean));

  for (const line of allLines) {
    const idx = detectStepIdx(line);
    if (idx < 0) continue;
    steps[idx].detail = steps[idx].detail ? `${steps[idx].detail}\n${line}` : line;
    steps[idx].isDone = true;
  }

  // Mark steps before current phase as done, current as active
  const phaseMap: Record<string, number> = { summarize: 0, analyze_query: 1, retrieve: 2, compress: 3 };
  const activeIdx = phaseMap[currentPhase] ?? 3;
  for (let i = 0; i < steps.length; i++) {
    if (i < activeIdx) steps[i].isDone = true;
    else if (i === activeIdx && currentPhase !== 'generate' && currentPhase !== 'complete') steps[i].isActive = true;
  }
  if (currentPhase === 'generate' || currentPhase === 'complete') {
    steps[3].isDone = true;
    steps[3].isActive = false;
  }

  return steps;
}

function parseSearchTrace(trace: string): { fileCount: number; files: { name: string; sections: string[] }[] } | null {
  if (!trace.startsWith('Searched')) return null;
  const countMatch = trace.match(/Searched (\d+) document/);
  const fileCount = countMatch ? parseInt(countMatch[1]) : 0;
  const parts = trace.split(' → ').slice(1);
  const files: { name: string; sections: string[] }[] = [];
  for (const part of parts) {
    if (part.startsWith('Selected:')) continue;
    const match = part.match(/^([^:]+): (.+)$/);
    if (match) {
      const name = match[1].trim();
      const sections = match[2].split(', ').map(s => s.replace(/^\[.*?]\s*/, '').trim()).filter(Boolean);
      files.push({ name, sections });
    }
  }
  return files.length > 0 || fileCount > 0 ? { fileCount, files } : null;
}

function StepDetail({ step, searchTree }: { step: Step; searchTree: ReturnType<typeof parseSearchTrace> }) {
  if (step.id === 'retrieve' && searchTree && searchTree.files.length > 0) {
    return (
      <div className="mt-1.5 space-y-1.5">
        <p className="text-[12px] text-black/40">Đã quét {searchTree.fileCount} tài liệu, tìm thấy trong {searchTree.files.length}:</p>
        {searchTree.files.map(file => (
          <div key={file.name} className="ml-1 pl-2.5 border-l-2 border-green-200/50">
            <p className="text-[12px] font-semibold text-black/60 flex items-center gap-1">
              <FileText className="w-3 h-3 text-black/30" />{file.name}
            </p>
            {file.sections.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {file.sections.slice(0, 4).map((sec, i) => (
                  <p key={i} className="text-[11px] text-black/35 pl-2">{sec}</p>
                ))}
                {file.sections.length > 4 && <p className="text-[10px] text-black/20 pl-2">+{file.sections.length - 4} mục nữa</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (step.id === 'retrieve' && searchTree) {
    return <p className="text-[12px] text-black/40 mt-1">Đã quét {searchTree.fileCount} tài liệu</p>;
  }
  if (step.id === 'retrieve' && step.detail) {
    return (
      <div className="mt-1 space-y-0.5">
        {step.detail.split('\n').map((line, i) => {
          const cleaned = line.trim();
          if (!cleaned) return null;
          const isSub = line.startsWith('  ');
          return (
            <p key={i} className={`text-[11px] text-black/35 ${isSub ? 'pl-3' : ''} ${cleaned.startsWith('Đang đọc') ? 'font-medium text-black/45' : ''}`}>
              {cleaned}
            </p>
          );
        })}
      </div>
    );
  }
  if (step.detail) {
    return (
      <div className="mt-1 space-y-0.5">
        {step.detail.split('\n').map((line, i) => {
          const cleaned = line.trim();
          return cleaned ? <p key={i} className="text-[11px] text-black/30">{cleaned}</p> : null;
        })}
      </div>
    );
  }
  return null;
}

export const AgentSteps: React.FC<AgentStepsProps> = ({ phase, reflections = [] }) => {
  const isComplete = phase === 'complete' || phase === 'generate';
  const steps = parseSteps(reflections as string[], phase);
  const [manualToggle, setManualToggle] = React.useState<{ phase: string; isCollapsed: boolean } | null>(null);
  const isCollapsed = (manualToggle?.phase === phase) ? manualToggle.isCollapsed : isComplete;
  const retrieveStep = steps.find(s => s.id === 'retrieve');
  const searchTree = retrieveStep?.detail ? parseSearchTrace(retrieveStep.detail) : null;

  return (
    <div className="mb-4 w-full bg-white border border-black/[0.06] rounded-[10px] overflow-hidden shadow-sm">
      <button onClick={() => setManualToggle({ phase, isCollapsed: !isCollapsed })}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.01] w-full text-left group">
        <div className="flex items-center gap-2.5">
          {!isComplete && <Loader2 className="w-3.5 h-3.5 text-[#D32F2F] animate-spin" strokeWidth={3} />}
          {isComplete && <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />}
          <span className="text-[13px] font-bold text-black/50">{isComplete ? 'Tiến trình suy luận' : 'MATE đang suy nghĩ...'}</span>
          {!isComplete && <span className="text-[11px] font-medium text-black/25">{steps.filter(s => s.isDone).length}/{steps.length} bước</span>}
        </div>
        <div className="flex-grow" />
        <div className="p-1 text-black/20 group-hover:text-black/40">{isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</div>
      </button>

      <div className={`grid transition-all duration-300 ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 border-t border-black/[0.03] pt-3">
            <div className="space-y-0">
              {steps.map((step, idx) => (
                <div key={step.id} className="relative flex gap-3">
                  {idx < steps.length - 1 && <div className={`absolute left-[11px] top-6 w-px h-full ${step.isDone ? 'bg-green-200' : 'bg-black/[0.04]'}`} />}
                  <div className={`relative z-10 flex items-center justify-center w-[23px] h-[23px] mt-0.5 rounded-full border-2 shrink-0 transition-all duration-300 ${
                    step.isDone ? 'bg-green-50 border-green-400' : step.isActive ? 'bg-[#D32F2F]/5 border-[#D32F2F] animate-pulse' : 'bg-white border-black/[0.06]'}`}>
                    {step.isDone ? <Check className="w-2.5 h-2.5 text-green-500" strokeWidth={4} />
                      : step.isActive ? <Loader2 className="w-2.5 h-2.5 text-[#D32F2F] animate-spin" strokeWidth={3} />
                        : <span className="w-1 h-1 rounded-full bg-black/10" />}
                  </div>
                  <div className="flex-1 pb-3 min-w-0">
                    <p className={`text-[13px] font-semibold leading-tight ${step.isDone ? 'text-black/50' : step.isActive ? 'text-black/80' : 'text-black/20'}`}>
                      {step.label}
                    </p>
                    <StepDetail step={step} searchTree={step.id === 'retrieve' ? searchTree : null} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
