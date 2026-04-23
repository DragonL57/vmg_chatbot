import React, { useState, useMemo } from 'react';
import { Compass, Database, Search, ArrowRight } from 'lucide-react';
import { type KnowledgeCollection } from '@core/services/supabase.service';

interface SiloGridProps {
  collections: KnowledgeCollection[];
  currentMode: string;
  onCollectionSelect: (mode: string) => void;
}

export const SiloGrid: React.FC<SiloGridProps> = ({ 
  collections, 
  currentMode, 
  onCollectionSelect 
}) => {
  const [colSearch, setColSearch] = useState('');

  const filteredCollections = useMemo(() => {
    return collections.filter(c => 
      c.name.toLowerCase().includes(colSearch.toLowerCase()) || 
      (c.description || '').toLowerCase().includes(colSearch.toLowerCase())
    );
  }, [collections, colSearch]);

  return (
    <div className="space-y-6 pt-6 border-t border-black/[0.05]">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-black/40 px-1">Không gian tri thức</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30" />
          <input 
            type="text" 
            placeholder="Lọc nguồn tri thức..." 
            value={colSearch}
            onChange={(e) => setColSearch(e.target.value)}
            className="w-full bg-black/[0.02] border border-black/[0.05] rounded-[6px] py-1.5 pl-9 pr-4 text-[13px] focus:bg-white focus:border-[#D32F2F]/40 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Auto Mode - Only show when collections are ready to ensure sync load */}
        {collections.length > 0 && ('tự động auto discovery'.includes(colSearch.toLowerCase())) && (
          <button
            onClick={() => onCollectionSelect('auto')}
            className={`notion-card group text-left p-5 flex flex-col gap-4 rounded-[12px] ${
              currentMode === 'auto' ? 'ring-2 ring-[#D32F2F] border-transparent shadow-md' : 'hover:bg-[#f6f5f4]'
            }`}
          >
            <div className="w-9 h-9 rounded-[6px] bg-[#D32F2F]/5 flex items-center justify-center border border-[#D32F2F]/10">
              <Compass className="w-5 h-5 text-[#D32F2F]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-black/90">Tìm kiếm tự động</h3>
              <p className="text-[13px] text-[#615d59] mt-1 leading-relaxed">Tự động điều hướng yêu cầu đến nguồn dữ liệu phù hợp nhất.</p>
            </div>
            {currentMode === 'auto' && (
              <div className="mt-auto pt-2 text-[11px] font-bold text-[#D32F2F] flex items-center uppercase tracking-wider">
                ĐANG HOẠT ĐỘNG <ArrowRight className="ml-1 w-3 h-3" />
              </div>
            )}
          </button>
        )}

        {filteredCollections.map(col => (
          <button
            key={col.id}
            onClick={() => onCollectionSelect(col.qdrantName)}
            className={`notion-card group text-left p-5 flex flex-col gap-4 rounded-[12px] ${
              currentMode === col.qdrantName ? 'ring-2 ring-[#D32F2F] border-transparent shadow-md' : 'hover:bg-[#f6f5f4]'
            }`}
          >
            <div className="w-9 h-9 rounded-[6px] bg-black/[0.03] flex items-center justify-center border border-black/[0.05]">
              <Database className="w-4.5 h-4.5 text-black/30 group-hover:text-[#D32F2F] transition-colors" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-black/90 truncate">{col.name}</h3>
              <p className="text-[13px] text-[#615d59] mt-1 leading-relaxed line-clamp-2">
                {col.description || 'Truy cập nguồn tri thức nội bộ VMG.'}
              </p>
            </div>
            {currentMode === col.qdrantName && (
              <div className="mt-auto pt-2 text-[11px] font-bold text-[#D32F2F] flex items-center uppercase tracking-wider">
                ĐANG HOẠT ĐỘNG <ArrowRight className="ml-1 w-3 h-3" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
