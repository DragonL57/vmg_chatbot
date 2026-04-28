import React from 'react';
import { FileText, Trash2, ArrowRight } from 'lucide-react';
import { type KnowledgeFile } from '@core/application/ports/knowledge-repository.port';
import Link from 'next/link';

interface FileTableProps {
  siloId: string;
  files: KnowledgeFile[];
  onDelete: (id: string) => void;
}

export const FileTable: React.FC<FileTableProps> = ({
  siloId,
  files,
  onDelete
}) => {
  return (
    <div className="border border-black/[0.08] rounded-[8px] overflow-hidden bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#f6f5f4] border-b border-black/[0.08]">
          <tr>
            <th className="px-6 py-3 text-[12px] font-bold text-black/40 w-[60%]">Tên tài liệu</th>
            <th className="hidden sm:table-cell px-6 py-3 text-[12px] font-bold text-black/40 w-[15%] text-center">Trạng thái</th>
            <th className="px-6 py-3 text-[12px] font-bold text-black/40 w-[25%] text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {files.map((file) => (
            <tr key={file.id} className="group hover:bg-[#f6f5f4]/50 transition-colors">
              <td className="px-6 py-4">
                <Link href={`/admin/silos/${siloId}/files/${file.id}`} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-[4px] mt-0.5 shrink-0 flex items-center justify-center ${file.filename.endsWith('.pdf') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-black/90 truncate group-hover:text-[#D32F2F] transition-colors">{file.filename}</p>
                    <p className="text-[12px] text-[#615d59] line-clamp-1 mt-0.5">{file.summary || 'Chưa có tóm tắt.'}</p>
                  </div>
                </Link>
              </td>
              <td className="hidden sm:table-cell px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${file.status === 'completed' ? 'bg-[#1aae39]' : file.status === 'failed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`}></div>
                  <span className="text-[12px] font-medium capitalize text-black/60">{file.status}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.preventDefault(); onDelete(file.id); }} 
                    className="p-1.5 text-black/30 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-black/[0.08] mx-1"></div>
                  <Link 
                    href={`/admin/silos/${siloId}/files/${file.id}`}
                    className="p-1.5 text-black/30 hover:text-black/80 hover:bg-black/5 rounded flex items-center gap-1"
                  >
                    <span className="text-[11px] font-bold">Sửa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
