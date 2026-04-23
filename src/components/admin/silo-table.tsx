import React from 'react';
import { Trash2, ArrowRight } from 'lucide-react';
import { type KnowledgeCollection, type KnowledgeFile } from '@core/services/supabase.service';
import Link from 'next/link';

interface SiloTableProps {
  collections: KnowledgeCollection[];
  files: KnowledgeFile[];
  onSelectSilo: (silo: KnowledgeCollection) => void;
  onRename: (id: string, name: string) => void;
  onUpdateDescription: (id: string, desc: string) => void;
  onDelete: (id: string) => void;
}

export const SiloTable: React.FC<SiloTableProps> = ({
  collections,
  files,
  onSelectSilo,
  onRename,
  onUpdateDescription,
  onDelete
}) => {
  return (
    <div className="border border-black/[0.08] rounded-[8px] overflow-hidden bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#f6f5f4] border-b border-black/[0.08]">
          <tr>
            <th className="px-6 py-3 text-[12px] font-bold text-black/40 w-[50%]">Không gian dữ liệu</th>
            <th className="hidden sm:table-cell px-6 py-3 text-[12px] font-bold text-black/40 w-[20%] text-center">Tài liệu</th>
            <th className="px-6 py-3 text-[12px] font-bold text-black/40 w-[30%] text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {collections.map(col => (
            <tr 
              key={col.id} 
              className="group hover:bg-[#f6f5f4]/50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4">
                <Link href={`/admin/silos/${col.id}`} className="block min-w-0">
                  <p className="text-[14px] font-semibold text-black/90 group-hover:text-[#D32F2F] transition-colors">{col.name}</p>
                  <p className="text-[12px] text-black/40 line-clamp-1 mt-0.5">{col.description || 'Chưa có mô tả.'}</p>
                </Link>
              </td>
              <td className="hidden sm:table-cell px-6 py-4 text-center text-[13px] font-medium text-black/60">
                {files.filter(f => f.mode === col.qdrantName).length}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.preventDefault(); onDelete(col.id); }} 
                    className="p-1.5 text-black/30 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-black/[0.08] mx-1"></div>
                  <button 
                    onClick={() => onSelectSilo(col)}
                    className="p-1.5 text-black/30 hover:text-black/80 hover:bg-black/5 rounded flex items-center gap-1"
                  >
                    <span className="text-[11px] font-bold">Quản lý</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
