import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Message } from '@core/types/chat';
import Image from 'next/image';
import { MessageItem } from './message-item';
import { 
  Search, 
  Cpu, 
  Loader2, 
  History, 
  ShieldCheck, 
  FileText, 
  MessageSquare, 
  Zap, 
  SearchCode, 
  CheckCircle2, 
  Sparkles,
  BookOpen,
  ArrowRight,
  Database,
  Globe,
  Filter,
  Compass
} from 'lucide-react';
import { type KnowledgeCollection } from '@core/services/supabase.service';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  loadingPhase?: string;
  phaseDetail?: string;
  currentMode?: string;
  sessionId?: string;
  collections?: KnowledgeCollection[];
  onCollectionSelect?: (mode: string) => void;
  onSuggestionClick?: (text: string) => void;
}

const AgentSteps = ({ phase, detail }: { phase?: string; detail?: string }) => {
  const steps = [
    { id: 'router',    label: 'Điều hướng không gian...', icon: Compass },
    { id: 'summarize', label: 'Tóm tắt ngữ cảnh...', icon: History },
    { id: 'analyze',   label: 'Phân tích ý định...', icon: Search },
    { id: 'retrieve',  label: 'Tìm kiếm tri thức...', icon: SearchCode },
    { id: 'grade',     label: 'Kiểm định thông tin...', icon: ShieldCheck },
    { id: 'rewrite',   label: 'Tối ưu truy vấn...', icon: Zap },
    { id: 'compress',  label: 'Trích xuất sự thật...', icon: FileText },
    { id: 'generate',  label: 'Đang trả lời...', icon: MessageSquare },
  ];

  const currentIdx = steps.findIndex(s => s.id === phase);

  return (
    <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-left-2 duration-500">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm shadow-slate-200/50 max-w-[280px] w-full text-black">
        <div className="flex items-center gap-2 mb-3 text-[#D32F2F]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Agentic Process</span>
        </div>
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentIdx && phase !== '';
            const isActive = step.id === phase;
            const isPending = idx > currentIdx || phase === '';

            if (isPending) return null;

            return (
              <div 
                key={step.id} 
                className={`flex flex-col gap-1 transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
                } ${isDone ? 'text-emerald-600' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-md shrink-0 ${
                    isActive ? 'bg-red-50 text-[#D32F2F]' : 
                    isDone ? 'bg-emerald-50 text-emerald-600' : 
                    'bg-slate-50'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className={`w-3 h-3 ${isActive ? 'animate-bounce' : ''}`} />}
                  </div>
                  <span className="text-[11px] font-semibold truncate">{step.label}</span>
                  {isActive && (
                    <div className="ml-auto flex gap-0.5">
                      <div className="w-1 h-1 bg-[#D32F2F] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1 h-1 bg-[#D32F2F] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1 h-1 bg-[#D32F2F] rounded-full animate-bounce"></div>
                    </div>
                  )}
                </div>
                {isActive && detail && (
                  <p className="ml-7 text-[10px] text-slate-500 font-medium italic animate-in fade-in duration-300">
                    → {detail}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading, 
  loadingPhase, 
  phaseDetail,
  currentMode,
  sessionId, 
  collections = [],
  onCollectionSelect,
  onSuggestionClick 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [colSearch, setColSearch] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  const filteredCollections = useMemo(() => {
    return collections.filter(c => 
      c.name.toLowerCase().includes(colSearch.toLowerCase()) || 
      (c.description || '').toLowerCase().includes(colSearch.toLowerCase())
    );
  }, [collections, colSearch]);

  const showTyping = isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user');

  const suggestions = [
    "Chính sách hoa hồng du học hè",
    "Quy trình chốt hồ sơ du học",
    "Giá chương trình Singapore 2026",
  ];

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-8 space-y-6 bg-slate-50/50 scroll-smooth"
    >

      {messages.length === 0 && !isLoading ? (
        <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Welcome Branding */}
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-white rounded-3xl shadow-xl shadow-red-100 border border-red-50 mb-2">
              <Image src="/apple-icon.svg" alt="VMG Logo" width={48} height={48} className="object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Chào mừng đến VMG Wiki</h2>
            <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed font-medium">
              Hệ thống trợ lý AI hỗ trợ tra cứu quy trình, chính sách và tài liệu nội bộ của VMG.
            </p>
          </div>

          {/* Collection Selection Cards */}
          <div className="space-y-6 text-black">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không gian kiến thức</p>
              
              {/* Search Bar for Collections */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Tìm kiếm không gian..."
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-red-500/10 focus:border-[#D32F2F]/50 transition-all text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Auto Discovery Mode Card */}
              {('tự động auto discovery'.includes(colSearch.toLowerCase())) && (
                <button
                  onClick={() => onCollectionSelect?.('auto')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left relative group col-span-full ${
                    currentMode === 'auto' 
                      ? 'bg-white border-[#D32F2F] shadow-md ring-2 ring-red-50' 
                      : 'bg-white/60 border-slate-100 hover:border-red-200 hover:bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 transition-colors ${currentMode === 'auto' ? 'bg-[#D32F2F] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Compass className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">Auto Discovery</h3>
                      <span className="text-[8px] px-1 bg-[#D32F2F] text-white rounded font-bold uppercase tracking-tighter">Smart</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">Tự động nhận diện và tìm kiếm trong tất cả các không gian phù hợp</p>
                  </div>
                  {currentMode === 'auto' && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-[#D32F2F] rounded-full shadow-[0_0_8px_rgba(211,47,47,0.8)] animate-pulse"></div>
                  )}
                </button>
              )}

              {/* Dynamic Collection Cards */}
              {filteredCollections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => onCollectionSelect?.(col.qdrantName)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left relative group ${
                    currentMode === col.qdrantName 
                      ? 'bg-white border-[#D32F2F] shadow-md ring-2 ring-red-50' 
                      : 'bg-white/60 border-slate-100 hover:border-red-200 hover:bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 transition-colors ${currentMode === col.qdrantName ? 'bg-[#D32F2F] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{col.name}</h3>
                    {col.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-1">{col.description}</p>
                    )}
                  </div>
                  {currentMode === col.qdrantName && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#D32F2F] rounded-full"></div>
                  )}
                </button>
              ))}

              {filteredCollections.length === 0 && !'auto discovery'.includes(colSearch.toLowerCase()) && (
                <div className="col-span-full py-8 text-center bg-slate-100/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-medium text-slate-400 italic text-black">Không tìm thấy không gian phù hợp</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Suggestions */}
          <div className="space-y-4 pt-4 border-t border-slate-100 text-black">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Gợi ý tìm kiếm</p>
             <div className="flex flex-wrap justify-center gap-2">
               {suggestions.map((text) => (
                 <button
                   key={text}
                   onClick={() => onSuggestionClick?.(text)}
                   className="bg-white border border-slate-200 py-2 px-4 rounded-full text-xs text-slate-600 font-semibold hover:border-[#D32F2F] hover:text-[#D32F2F] hover:shadow-md transition-all active:scale-95"
                 >
                   {text}
                 </button>
               ))}
             </div>
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            msg.content ? <MessageItem key={msg.id} message={msg} conversation={messages} sessionId={sessionId} /> : null
          ))}
          {showTyping && <AgentSteps phase={loadingPhase} detail={phaseDetail} />}
        </>
      )}
    </div>
  );
};
